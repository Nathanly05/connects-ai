begin;

alter table public.signup_attempts
add column if not exists ip_intelligence jsonb not null default '{}'::jsonb,
add column if not exists blocked_by_ip_intelligence boolean not null default false;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  event_type text not null,
  ip_address text,
  user_agent text,
  device_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_event_type_created_at_idx
on public.audit_logs(event_type, created_at desc);

create index if not exists audit_logs_user_id_created_at_idx
on public.audit_logs(user_id, created_at desc);

create index if not exists audit_logs_email_created_at_idx
on public.audit_logs(email, created_at desc);

grant select on public.audit_logs to authenticated;

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin" on public.audit_logs;

create policy "audit_logs_select_admin"
on public.audit_logs
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

create or replace function public.record_audit_log(
  p_user_id uuid,
  p_email text,
  p_event_type text,
  p_ip_address text default null,
  p_user_agent text default null,
  p_device_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(p_event_type, '')), '') is null then
    raise exception 'Event type is required';
  end if;

  insert into public.audit_logs (
    user_id,
    email,
    event_type,
    ip_address,
    user_agent,
    device_id,
    metadata
  )
  values (
    p_user_id,
    nullif(btrim(p_email), ''),
    nullif(btrim(p_event_type), ''),
    nullif(btrim(p_ip_address), ''),
    nullif(btrim(p_user_agent), ''),
    nullif(btrim(p_device_id), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.get_registration_guard_counts(
  p_ip_address text
)
returns table (
  attempt_count_hour integer,
  successful_ip_24h integer,
  successful_ip_lifetime integer
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)::integer
      from public.signup_attempts as sa
      where sa.created_at >= now() - interval '1 hour'
        and nullif(btrim(coalesce(p_ip_address, '')), '') is not null
        and sa.ip_address = p_ip_address
    ) as attempt_count_hour,
    (
      select count(*)::integer
      from public.signup_attempts as sa
      where sa.success = true
        and sa.created_at >= now() - interval '24 hours'
        and nullif(btrim(coalesce(p_ip_address, '')), '') is not null
        and sa.ip_address = p_ip_address
    ) as successful_ip_24h,
    (
      select count(*)::integer
      from public.signup_attempts as sa
      where sa.success = true
        and nullif(btrim(coalesce(p_ip_address, '')), '') is not null
        and sa.ip_address = p_ip_address
    ) as successful_ip_lifetime;
$$;

drop function if exists public.record_signup_attempt(text, text, text, text, boolean, text, uuid);

create or replace function public.record_signup_attempt(
  p_email text,
  p_ip_address text,
  p_user_agent text,
  p_device_id text,
  p_success boolean,
  p_reason text default null,
  p_user_id uuid default null,
  p_ip_intelligence jsonb default '{}'::jsonb,
  p_blocked_by_ip_intelligence boolean default false
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
    reason,
    ip_intelligence,
    blocked_by_ip_intelligence
  )
  values (
    nullif(btrim(p_email), ''),
    nullif(btrim(p_ip_address), ''),
    nullif(btrim(p_user_agent), ''),
    nullif(btrim(p_device_id), ''),
    coalesce(p_success, false),
    nullif(btrim(p_reason), ''),
    coalesce(p_ip_intelligence, '{}'::jsonb),
    coalesce(p_blocked_by_ip_intelligence, false)
  );
end;
$$;

create or replace function public.grant_signup_free_credits_if_eligible(
  p_user_id uuid default auth.uid()
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_free_amount integer := 10;
  v_existing_free_claim boolean := false;
  v_email_verified boolean := false;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_actor_id <> p_user_id and not exists (
    select 1
    from public.profiles as p
    where p.id = v_actor_id
      and p.role = 'admin'
      and p.status = 'approved'
  ) then
    raise exception 'Only the user or an approved admin can grant signup credits';
  end if;

  select *
  into v_profile
  from public.profiles as p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.status <> 'approved' then
    return v_profile;
  end if;

  select au.email_confirmed_at is not null
  into v_email_verified
  from auth.users as au
  where au.id = p_user_id;

  if not coalesce(v_email_verified, false) then
    update public.profiles as p
    set risk_note = coalesce(nullif(p.risk_note, ''), '邮箱未验证，暂不发放免费额度')
    where p.id = p_user_id
    returning * into v_profile;

    return v_profile;
  end if;

  if coalesce(v_profile.free_credits_granted, false) then
    return v_profile;
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

  if v_existing_free_claim then
    update public.profiles as p
    set risk_note = '同 IP 或同设备已领取过免费额度'
    where p.id = p_user_id
    returning * into v_profile;

    return v_profile;
  end if;

  update public.profiles as p
  set credits = p.credits + v_free_amount,
      free_credits_granted = true,
      risk_note = null
  where p.id = p_user_id
  returning * into v_profile;

  insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
  values (
    p_user_id,
    case when v_actor_id = p_user_id then null else v_actor_id end,
    v_free_amount,
    v_profile.credits,
    'Signup free credits'
  );

  return v_profile;
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

  return public.grant_signup_free_credits_if_eligible(p_user_id);
end;
$$;

create or replace function public.audit_credit_grant_from_credit_logs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if new.amount <= 0 then
    return new;
  end if;

  select p.email
  into v_email
  from public.profiles as p
  where p.id = new.user_id;

  insert into public.audit_logs (
    user_id,
    email,
    event_type,
    metadata
  )
  values (
    new.user_id,
    v_email,
    'credit_grant',
    jsonb_build_object(
      'amount', new.amount,
      'balance_after', new.balance_after,
      'reason', new.reason,
      'admin_id', new.admin_id,
      'credit_log_id', new.id
    )
  );

  return new;
end;
$$;

drop trigger if exists audit_credit_grant_after_insert on public.credit_logs;

create trigger audit_credit_grant_after_insert
after insert on public.credit_logs
for each row
when (new.amount > 0)
execute function public.audit_credit_grant_from_credit_logs();

revoke all on function public.record_audit_log(uuid, text, text, text, text, text, jsonb) from public;
revoke all on function public.get_registration_guard_counts(text) from public;
revoke all on function public.record_signup_attempt(text, text, text, text, boolean, text, uuid, jsonb, boolean) from public;
revoke all on function public.grant_signup_free_credits_if_eligible(uuid) from public;
revoke all on function public.admin_approve_user(uuid) from public;
revoke all on function public.audit_credit_grant_from_credit_logs() from public;

grant execute on function public.record_audit_log(uuid, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.get_registration_guard_counts(text) to anon, authenticated;
grant execute on function public.record_signup_attempt(text, text, text, text, boolean, text, uuid, jsonb, boolean) to anon, authenticated;
grant execute on function public.grant_signup_free_credits_if_eligible(uuid) to authenticated;
grant execute on function public.admin_approve_user(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
