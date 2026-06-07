begin;

alter table public.chat_messages
add column if not exists mode text not null default 'instant';

do $$
begin
  alter table public.chat_messages
  add constraint chat_messages_mode_check
  check (mode in ('instant', 'thinking'));
exception when duplicate_object then null;
end $$;

create index if not exists chat_messages_mode_created_at_idx
on public.chat_messages(mode, created_at desc);

drop function if exists public.save_chat_exchange(text, uuid, text, text, text);

create or replace function public.save_chat_exchange(
  p_assistant_content text,
  p_session_id uuid,
  p_title text,
  p_user_content text,
  p_mode text default 'instant'
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
  v_mode text := coalesce(nullif(lower(btrim(p_mode)), ''), 'instant');
  v_credit_cost integer;
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

  if v_mode not in ('instant', 'thinking') then
    raise exception 'Invalid chat mode';
  end if;

  v_credit_cost := case
    when v_mode = 'thinking' then 5
    else 1
  end;

  select *
  into v_profile
  from public.profiles as p
  where p.id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.status <> 'approved' then
    raise exception 'Only approved users can chat';
  end if;

  if v_profile.credits < v_credit_cost then
    raise exception 'Credits不足，请充值';
  end if;

  if v_session_id is null then
    insert into public.chat_sessions (user_id, title)
    values (v_user_id, left(v_title, 40))
    returning id into v_session_id;
  else
    if not exists (
      select 1
      from public.chat_sessions as cs
      where cs.id = v_session_id
        and cs.user_id = v_user_id
    ) then
      raise exception 'Chat session not found';
    end if;

    update public.chat_sessions as cs
    set title = case
          when cs.title = '新对话' then left(v_title, 40)
          else cs.title
        end,
        updated_at = now()
    where cs.id = v_session_id
      and cs.user_id = v_user_id;
  end if;

  insert into public.chat_messages (session_id, user_id, role, content, mode)
  values (v_session_id, v_user_id, 'user', v_user_content, v_mode);

  insert into public.chat_messages (session_id, user_id, role, content, mode)
  values (v_session_id, v_user_id, 'assistant', v_assistant_content, v_mode);

  update public.profiles as p
  set credits = p.credits - v_credit_cost
  where p.id = v_user_id
  returning p.* into v_profile;

  insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
  values (
    v_user_id,
    null,
    -v_credit_cost,
    v_profile.credits,
    case
      when v_mode = 'thinking' then 'AI 对话 Thinking 模式扣除 5 credits'
      else 'AI 对话 Instant 模式扣除 1 credit'
    end
  );

  return query select v_session_id, v_profile.credits;
end;
$$;

revoke all on function public.save_chat_exchange(text, uuid, text, text, text) from public;
grant execute on function public.save_chat_exchange(text, uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
