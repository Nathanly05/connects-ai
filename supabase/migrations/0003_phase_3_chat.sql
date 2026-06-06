begin;

do $$
begin
  create type public.message_role as enum ('user', 'assistant', 'system');
exception when duplicate_object then null;
end $$;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  role public.message_role not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_session_user_fk
    foreign key (session_id, user_id)
    references public.chat_sessions(id, user_id)
    on delete cascade
);

create index if not exists chat_messages_session_id_created_at_idx
on public.chat_messages(session_id, created_at);

create index if not exists chat_messages_user_id_created_at_idx
on public.chat_messages(user_id, created_at desc);

grant select on public.chat_messages to authenticated;

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select_own_or_admin" on public.chat_messages;

create policy "chat_messages_select_own_or_admin"
on public.chat_messages
for select
to authenticated
using (
  (public.is_approved() and user_id = (select auth.uid()))
  or public.is_admin()
);

create or replace function public.save_chat_exchange(
  p_session_id uuid,
  p_user_content text,
  p_assistant_content text,
  p_title text default null
)
returns table (
  session_id uuid,
  credits integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_session_id uuid := p_session_id;
  v_user_content text := nullif(btrim(p_user_content), '');
  v_assistant_content text := nullif(btrim(p_assistant_content), '');
  v_title text := coalesce(nullif(btrim(p_title), ''), '新对话');
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_user_content is null then
    raise exception 'User message is required';
  end if;

  if v_assistant_content is null then
    raise exception 'Assistant message is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.status <> 'approved' then
    raise exception 'Only approved users can chat';
  end if;

  if v_profile.credits <= 0 then
    raise exception 'Credits不足，请充值';
  end if;

  if v_session_id is null then
    insert into public.chat_sessions (user_id, title)
    values (v_user_id, left(v_title, 40))
    returning id into v_session_id;
  else
    if not exists (
      select 1
      from public.chat_sessions
      where id = v_session_id
        and user_id = v_user_id
    ) then
      raise exception 'Chat session not found';
    end if;

    update public.chat_sessions
    set title = case
          when title = '新对话' then left(v_title, 40)
          else title
        end,
        updated_at = now()
    where id = v_session_id
      and user_id = v_user_id;
  end if;

  update public.profiles
  set credits = credits - 1
  where id = v_user_id
  returning * into v_profile;

  insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
  values (v_user_id, null, -1, v_profile.credits, 'AI 对话扣除 1 credit');

  insert into public.chat_messages (session_id, user_id, role, content)
  values
    (v_session_id, v_user_id, 'user', v_user_content),
    (v_session_id, v_user_id, 'assistant', v_assistant_content);

  return query select v_session_id, v_profile.credits;
end;
$$;

revoke all on function public.save_chat_exchange(uuid, text, text, text) from public;
grant execute on function public.save_chat_exchange(uuid, text, text, text) to authenticated;

commit;
