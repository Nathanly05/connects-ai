begin;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  stripe_session_id text not null unique,
  plan_name text not null,
  amount_gbp numeric not null,
  credits integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.payment_orders
  add constraint payment_orders_status_check
  check (status in ('pending', 'paid', 'failed'));
exception when duplicate_object then null;
end $$;

create index if not exists payment_orders_user_id_created_at_idx
on public.payment_orders(user_id, created_at desc);

create index if not exists payment_orders_status_created_at_idx
on public.payment_orders(status, created_at desc);

grant select, insert on public.payment_orders to authenticated;

alter table public.payment_orders enable row level security;

drop policy if exists "payment_orders_select_own_or_admin" on public.payment_orders;
drop policy if exists "payment_orders_insert_own_pending" on public.payment_orders;

create policy "payment_orders_select_own_or_admin"
on public.payment_orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_admin()
);

create policy "payment_orders_insert_own_pending"
on public.payment_orders
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and amount_gbp > 0
  and credits > 0
);

create or replace function public.complete_stripe_payment_order(p_stripe_session_id text)
returns public.payment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_updated_order public.payment_orders%rowtype;
  v_balance integer;
begin
  if p_stripe_session_id is null or btrim(p_stripe_session_id) = '' then
    raise exception 'Stripe session id is required';
  end if;

  select *
  into v_order
  from public.payment_orders as po
  where po.stripe_session_id = p_stripe_session_id
  for update;

  if not found then
    raise exception 'Payment order not found';
  end if;

  if v_order.status = 'paid' then
    return v_order;
  end if;

  if v_order.status <> 'pending' then
    return v_order;
  end if;

  update public.profiles as p
  set credits = p.credits + v_order.credits
  where p.id = v_order.user_id
  returning p.credits into v_balance;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;

  insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
  values (
    v_order.user_id,
    null,
    v_order.credits,
    v_balance,
    'Stripe checkout completed'
  );

  update public.payment_orders as po
  set status = 'paid'
  where po.id = v_order.id
  returning * into v_updated_order;

  return v_updated_order;
end;
$$;

revoke all on function public.complete_stripe_payment_order(text) from public;
grant execute on function public.complete_stripe_payment_order(text) to service_role;

notify pgrst, 'reload schema';

commit;
