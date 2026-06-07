begin;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  type text not null,
  title text not null,
  message text not null,
  contact text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint support_tickets_type_check
    check (type in ('账号问题', '充值问题', 'AI回复问题', 'Credits问题', '其他')),
  constraint support_tickets_status_check
    check (status in ('open', 'in_progress', 'resolved')),
  constraint support_tickets_title_not_blank
    check (btrim(title) <> ''),
  constraint support_tickets_message_not_blank
    check (btrim(message) <> '')
);

create index if not exists support_tickets_user_id_created_at_idx
on public.support_tickets(user_id, created_at desc);

create index if not exists support_tickets_status_created_at_idx
on public.support_tickets(status, created_at desc);

grant select, insert, update on public.support_tickets to authenticated;

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_own_or_admin" on public.support_tickets;
drop policy if exists "support_tickets_insert_own_open" on public.support_tickets;
drop policy if exists "support_tickets_update_admin" on public.support_tickets;

create policy "support_tickets_select_own_or_admin"
on public.support_tickets
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'approved'
  )
);

create policy "support_tickets_insert_own_open"
on public.support_tickets
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'open'
);

create policy "support_tickets_update_admin"
on public.support_tickets
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'approved'
  )
)
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'approved'
  )
);

notify pgrst, 'reload schema';

commit;
