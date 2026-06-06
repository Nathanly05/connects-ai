begin;

create table if not exists public.recharge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  amount numeric not null,
  credits integer not null,
  screenshot_url text,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

do $$
begin
  alter table public.recharge_requests
  add constraint recharge_requests_status_check
  check (status in ('pending', 'approved', 'rejected'));
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
  and credits > 0
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_proofs_insert_own" on storage.objects;
drop policy if exists "payment_proofs_select_own_or_admin" on storage.objects;

create policy "payment_proofs_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "payment_proofs_select_own_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_admin()
  )
);

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

  update public.profiles as p
  set credits = p.credits + v_request.credits
  where p.id = v_request.user_id
  returning p.credits into v_balance;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
  values (
    v_request.user_id,
    v_admin_id,
    v_request.credits,
    v_balance,
    'Recharge approved'
  );

  update public.recharge_requests as rr
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_admin_id
  where rr.id = p_request_id
  returning * into v_updated_request;

  return v_updated_request;
end;
$$;

create or replace function public.admin_reject_recharge(p_request_id uuid)
returns public.recharge_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_request public.recharge_requests%rowtype;
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
      reviewed_by = v_admin_id
  where rr.id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.admin_approve_recharge(uuid) from public;
revoke all on function public.admin_reject_recharge(uuid) from public;

grant execute on function public.admin_approve_recharge(uuid) to authenticated;
grant execute on function public.admin_reject_recharge(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
