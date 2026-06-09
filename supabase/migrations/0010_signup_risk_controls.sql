begin;

alter table public.profiles
add column if not exists signup_ip text,
add column if not exists signup_user_agent text,
add column if not exists device_id text,
add column if not exists free_credits_granted boolean not null default false,
add column if not exists risk_note text,
add column if not exists last_login_ip text,
add column if not exists last_login_at timestamptz;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.profiles drop constraint %I', v_constraint.conname);
  end loop;

  alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'banned'));
exception when duplicate_object then null;
end $$;

create table if not exists public.signup_attempts (
  id uuid primary key default gen_random_uuid(),
  email text,
  ip_address text,
  user_agent text,
  device_id text,
  success boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists signup_attempts_ip_created_at_idx
on public.signup_attempts(ip_address, created_at desc);

create index if not exists signup_attempts_device_created_at_idx
on public.signup_attempts(device_id, created_at desc);

create index if not exists signup_attempts_email_created_at_idx
on public.signup_attempts(email, created_at desc);

grant insert on public.signup_attempts to anon, authenticated;
grant select on public.signup_attempts to authenticated;

alter table public.signup_attempts enable row level security;

drop policy if exists "signup_attempts_insert_any" on public.signup_attempts;
drop policy if exists "signup_attempts_select_admin" on public.signup_attempts;

create policy "signup_attempts_insert_any"
on public.signup_attempts
for insert
to anon, authenticated
with check (true);

create policy "signup_attempts_select_admin"
on public.signup_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'approved'
  )
);

create or replace function public.get_signup_risk_counts(
  p_ip_address text,
  p_device_id text
)
returns table (
  ip_count integer,
  device_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)::integer
      from public.signup_attempts as sa
      where sa.success = true
        and sa.created_at >= now() - interval '24 hours'
        and nullif(btrim(coalesce(p_ip_address, '')), '') is not null
        and sa.ip_address = p_ip_address
    ) as ip_count,
    (
      select count(*)::integer
      from public.signup_attempts as sa
      where sa.success = true
        and sa.created_at >= now() - interval '24 hours'
        and nullif(btrim(coalesce(p_device_id, '')), '') is not null
        and sa.device_id = p_device_id
    ) as device_count;
$$;

create or replace function public.record_signup_attempt(
  p_email text,
  p_ip_address text,
  p_user_agent text,
  p_device_id text,
  p_success boolean,
  p_reason text default null,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.signup_attempts (
    email,
    ip_address,
    user_agent,
    device_id,
    success,
    reason
  )
  values (
    nullif(btrim(p_email), ''),
    nullif(btrim(p_ip_address), ''),
    nullif(btrim(p_user_agent), ''),
    nullif(btrim(p_device_id), ''),
    coalesce(p_success, false),
    nullif(btrim(p_reason), '')
  );

  if p_user_id is not null and (select auth.uid()) = p_user_id then
    update public.profiles as p
    set signup_ip = nullif(btrim(p_ip_address), ''),
        signup_user_agent = nullif(btrim(p_user_agent), ''),
        device_id = nullif(btrim(p_device_id), ''),
        status = case
          when coalesce(p_success, false) then p.status
          else 'rejected'
        end,
        risk_note = case
          when coalesce(p_success, false) then p.risk_note
          else coalesce(nullif(btrim(p_reason), ''), '注册请求过于频繁')
        end
    where p.id = p_user_id
      and lower(p.email) = lower(nullif(btrim(p_email), ''));
  end if;
end;
$$;

create or replace function public.admin_approve_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_updated_profile public.profiles%rowtype;
  v_should_grant_free boolean := false;
  v_free_amount integer := 10;
  v_existing_free_claim boolean := false;
begin
  if v_admin_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_admin_id
      and p.role = 'admin'
      and p.status = 'approved'
  ) then
    raise exception 'Only approved admins can approve users';
  end if;

  select *
  into v_profile
  from public.profiles as p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  select exists (
    select 1
    from public.profiles as p
    where p.id <> p_user_id
      and p.free_credits_granted = true
      and (
        (
          nullif(btrim(coalesce(v_profile.signup_ip, '')), '') is not null
          and p.signup_ip = v_profile.signup_ip
        )
        or (
          nullif(btrim(coalesce(v_profile.device_id, '')), '') is not null
          and p.device_id = v_profile.device_id
        )
      )
  )
  into v_existing_free_claim;

  v_should_grant_free := not coalesce(v_profile.free_credits_granted, false)
    and not v_existing_free_claim;

  if v_should_grant_free then
    update public.profiles as p
    set status = 'approved',
        credits = p.credits + v_free_amount,
        free_credits_granted = true,
        risk_note = null
    where p.id = p_user_id
    returning * into v_updated_profile;

    insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
    values (
      p_user_id,
      v_admin_id,
      v_free_amount,
      v_updated_profile.credits,
      'Signup free credits'
    );
  else
    update public.profiles as p
    set status = 'approved',
        risk_note = case
          when v_existing_free_claim then '同 IP 或同设备已领取过免费额度'
          else p.risk_note
        end
    where p.id = p_user_id
    returning * into v_updated_profile;
  end if;

  return v_updated_profile;
end;
$$;

create or replace function public.admin_approve_user_without_free_credits(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_admin_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_admin_id
      and p.role = 'admin'
      and p.status = 'approved'
  ) then
    raise exception 'Only approved admins can approve users';
  end if;

  update public.profiles as p
  set status = 'approved'
  where p.id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.admin_reject_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_admin_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_admin_id
      and p.role = 'admin'
      and p.status = 'approved'
  ) then
    raise exception 'Only approved admins can reject users';
  end if;

  update public.profiles as p
  set status = 'rejected'
  where p.id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

create or replace function public.admin_ban_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_admin_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = v_admin_id
      and p.role = 'admin'
      and p.status = 'approved'
  ) then
    raise exception 'Only approved admins can ban users';
  end if;

  update public.profiles as p
  set status = 'banned',
      risk_note = coalesce(nullif(p.risk_note, ''), '管理员封禁账号')
  where p.id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.get_signup_risk_counts(text, text) from public;
revoke all on function public.record_signup_attempt(text, text, text, text, boolean, text, uuid) from public;
revoke all on function public.admin_approve_user(uuid) from public;
revoke all on function public.admin_approve_user_without_free_credits(uuid) from public;
revoke all on function public.admin_reject_user(uuid) from public;
revoke all on function public.admin_ban_user(uuid) from public;

grant execute on function public.get_signup_risk_counts(text, text) to anon, authenticated;
grant execute on function public.record_signup_attempt(text, text, text, text, boolean, text, uuid) to anon, authenticated;
grant execute on function public.admin_approve_user(uuid) to authenticated;
grant execute on function public.admin_approve_user_without_free_credits(uuid) to authenticated;
grant execute on function public.admin_reject_user(uuid) to authenticated;
grant execute on function public.admin_ban_user(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
