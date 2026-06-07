begin;

create table if not exists public.recharge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  email text,
  package_name text,
  amount numeric not null,
  credits integer,
  payment_time timestamptz,
  remark text,
  screenshot_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  reject_reason text
);

alter table public.recharge_requests
add column if not exists email text,
add column if not exists package_name text,
add column if not exists credits integer,
add column if not exists payment_time timestamptz,
add column if not exists remark text,
add column if not exists reject_reason text,
add column if not exists reviewed_at timestamptz,
add column if not exists reviewed_by uuid;

do $$
begin
  alter table public.recharge_requests
  add constraint recharge_requests_status_check
  check (status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.recharge_requests
  add constraint recharge_requests_package_name_check
  check (package_name is null or package_name in ('Starter', 'Pro', 'Max'));
exception when duplicate_object then null;
end $$;

create index if not exists recharge_requests_user_id_created_at_idx
on public.recharge_requests(user_id, created_at desc);

create index if not exists recharge_requests_status_created_at_idx
on public.recharge_requests(status, created_at desc);

grant select, insert on public.recharge_requests to authenticated;

alter table public.recharge_requests enable row level security;

drop policy if exists "recharge_requests_select_own_or_admin" on public.recharge_requests;
drop policy if exists "recharge_requests_insert_own_pending" on public.recharge_requests;

create policy "recharge_requests_select_own_or_admin"
on public.recharge_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_admin()
);

create policy "recharge_requests_insert_own_pending"
on public.recharge_requests
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and amount > 0
);

create or replace function public.recharge_credits_for_package(p_package_name text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_package_name
    when 'Starter' then 100
    when 'Pro' then 500
    when 'Max' then 1500
    else null
  end;
$$;

create or replace function public.admin_approve_recharge(p_request_id uuid)
returns public.recharge_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_request public.recharge_requests%rowtype;
  v_updated_request public.recharge_requests%rowtype;
  v_balance integer;
  v_credits integer;
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
    raise exception 'Only approved admins can approve recharge requests';
  end if;

  select *
  into v_request
  from public.recharge_requests as rr
  where rr.id = p_request_id
  for update;

  if not found then
    raise exception 'Recharge request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Recharge request already reviewed';
  end if;

  v_credits := coalesce(
    public.recharge_credits_for_package(v_request.package_name),
    v_request.credits
  );

  if v_credits is null or v_credits <= 0 then
    raise exception 'Invalid recharge package';
  end if;

  update public.profiles as p
  set credits = p.credits + v_credits
  where p.id = v_request.user_id
  returning p.credits into v_balance;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
  values (
    v_request.user_id,
    v_admin_id,
    v_credits,
    v_balance,
    'GlobePay recharge approved'
  );

  update public.recharge_requests as rr
  set status = 'approved',
      credits = v_credits,
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      reject_reason = null
  where rr.id = p_request_id
  returning * into v_updated_request;

  return v_updated_request;
end;
$$;

create or replace function public.admin_reject_recharge(
  p_request_id uuid,
  p_reject_reason text default null
)
returns public.recharge_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_request public.recharge_requests%rowtype;
  v_reason text := nullif(btrim(p_reject_reason), '');
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
    raise exception 'Only approved admins can reject recharge requests';
  end if;

  select *
  into v_request
  from public.recharge_requests as rr
  where rr.id = p_request_id
  for update;

  if not found then
    raise exception 'Recharge request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Recharge request already reviewed';
  end if;

  update public.recharge_requests as rr
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_admin_id,
      reject_reason = v_reason
  where rr.id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.recharge_credits_for_package(text) from public;
revoke all on function public.admin_approve_recharge(uuid) from public;
revoke all on function public.admin_reject_recharge(uuid, text) from public;

grant execute on function public.recharge_credits_for_package(text) to authenticated;
grant execute on function public.admin_approve_recharge(uuid) to authenticated;
grant execute on function public.admin_reject_recharge(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
