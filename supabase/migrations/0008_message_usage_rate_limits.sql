begin;

create table if not exists public.message_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  minute_window timestamptz not null,
  message_count integer not null default 0,
  rate_limited_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date, minute_window),
  constraint message_usage_message_count_check check (message_count >= 0),
  constraint message_usage_rate_limited_count_check check (rate_limited_count >= 0)
);

create index if not exists message_usage_date_idx
on public.message_usage(date);

create index if not exists message_usage_user_id_date_idx
on public.message_usage(user_id, date);

grant select on public.message_usage to authenticated;

alter table public.message_usage enable row level security;

drop policy if exists "message_usage_select_own_or_admin" on public.message_usage;

create policy "message_usage_select_own_or_admin"
on public.message_usage
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_admin()
);

create or replace function public.check_chat_rate_limit(p_credit_cost integer default 1)
returns table (
  allowed boolean,
  reason text,
  minute_count integer,
  daily_count integer,
  rate_limited boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_today date := current_date;
  v_minute_window timestamptz := date_trunc('minute', now());
  v_minute_count integer := 0;
  v_daily_count integer := 0;
  v_is_admin boolean := false;
  v_credit_cost integer := greatest(coalesce(p_credit_cost, 1), 1);
begin
  if v_user_id is null then
    return query select false, '请先登录。', 0, 0, false;
    return;
  end if;

  select *
  into v_profile
  from public.profiles as p
  where p.id = v_user_id;

  if not found then
    return query select false, '账号信息不存在。', 0, 0, false;
    return;
  end if;

  if v_profile.status <> 'approved' then
    return query select false, '账号尚未通过审核。', 0, 0, false;
    return;
  end if;

  if v_profile.credits < v_credit_cost then
    return query select false, 'Credits 不足，请充值后继续使用。', 0, 0, false;
    return;
  end if;

  v_is_admin := v_profile.role = 'admin';

  insert into public.message_usage (
    user_id,
    date,
    minute_window,
    message_count,
    rate_limited_count
  )
  values (
    v_user_id,
    v_today,
    v_minute_window,
    0,
    0
  )
  on conflict (user_id, date, minute_window) do nothing;

  select mu.message_count
  into v_minute_count
  from public.message_usage as mu
  where mu.user_id = v_user_id
    and mu.date = v_today
    and mu.minute_window = v_minute_window
  for update;

  select coalesce(sum(mu.message_count), 0)::integer
  into v_daily_count
  from public.message_usage as mu
  where mu.user_id = v_user_id
    and mu.date = v_today;

  if v_minute_count >= 10 then
    update public.message_usage as mu
    set rate_limited_count = mu.rate_limited_count + 1,
        updated_at = now()
    where mu.user_id = v_user_id
      and mu.date = v_today
      and mu.minute_window = v_minute_window;

    return query select false, '发送过快，请稍后再试', v_minute_count, v_daily_count, true;
    return;
  end if;

  if not v_is_admin and v_daily_count >= 300 then
    update public.message_usage as mu
    set rate_limited_count = mu.rate_limited_count + 1,
        updated_at = now()
    where mu.user_id = v_user_id
      and mu.date = v_today
      and mu.minute_window = v_minute_window;

    return query select false, '今日发送次数已达上限，请明天再试。', v_minute_count, v_daily_count, true;
    return;
  end if;

  update public.message_usage as mu
  set message_count = mu.message_count + 1,
      updated_at = now()
  where mu.user_id = v_user_id
    and mu.date = v_today
    and mu.minute_window = v_minute_window
  returning mu.message_count into v_minute_count;

  v_daily_count := v_daily_count + 1;

  return query select true, null::text, v_minute_count, v_daily_count, false;
end;
$$;

revoke all on function public.check_chat_rate_limit(integer) from public;
grant execute on function public.check_chat_rate_limit(integer) to authenticated;

notify pgrst, 'reload schema';

commit;
