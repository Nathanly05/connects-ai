begin;

alter table public.profiles
add column if not exists plan_type text not null default 'free';

do $$
begin
  alter table public.profiles
  add constraint profiles_plan_type_check
  check (plan_type in ('free', 'basic', 'standard', 'premium', 'manual'));
exception when duplicate_object then null;
end $$;

alter table public.recharge_requests
drop constraint if exists recharge_requests_package_name_check;

alter table public.recharge_requests
add constraint recharge_requests_package_name_check
check (
  package_name is null
  or package_name in ('Starter', 'Pro', 'Max', 'Basic', 'Standard', 'Premium')
);

alter table public.support_tickets
drop constraint if exists support_tickets_type_check;

alter table public.support_tickets
add constraint support_tickets_type_check
check (type in ('账号问题', '充值问题', 'AI回复问题', 'Credits问题', '剩余次数问题', '其他'));

create or replace function public.plan_type_for_package(p_package_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_package_name
    when 'Basic' then 'basic'
    when 'Standard' then 'standard'
    when 'Premium' then 'premium'
    when 'Starter' then 'basic'
    when 'Pro' then 'standard'
    when 'Max' then 'premium'
    else 'manual'
  end;
$$;

create or replace function public.recharge_credits_for_package(p_package_name text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_package_name
    when 'Basic' then 50
    when 'Standard' then 300
    when 'Premium' then 1000
    when 'Starter' then 100
    when 'Pro' then 500
    when 'Max' then 1500
    else null
  end;
$$;

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
    return query select false, 'Remaining Chats 不足，请购买套餐后继续使用。', 0, 0, false;
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
  v_mode text := 'instant';
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
  from public.profiles as p
  where p.id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.status <> 'approved' then
    raise exception 'Only approved users can chat';
  end if;

  if v_profile.credits < 1 then
    raise exception 'Remaining Chats 不足，请购买套餐后继续使用。';
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
  set credits = p.credits - 1
  where p.id = v_user_id
  returning p.* into v_profile;

  insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
  values (v_user_id, null, -1, v_profile.credits, 'AI chat completed');

  return query select v_session_id, v_profile.credits;
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
    set risk_note = coalesce(nullif(p.risk_note, ''), '邮箱未验证，暂不发放免费次数')
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
    set risk_note = '同 IP 或同设备已领取过免费次数'
    where p.id = p_user_id
    returning * into v_profile;

    return v_profile;
  end if;

  update public.profiles as p
  set credits = p.credits + v_free_amount,
      plan_type = 'free',
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
    'Signup free chats'
  );

  return v_profile;
end;
$$;

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
  v_plan_type text;
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

  v_plan_type := public.plan_type_for_package(v_order.plan_name);

  update public.profiles as p
  set credits = p.credits + v_order.credits,
      plan_type = v_plan_type
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
  v_plan_type text;
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
  v_plan_type := public.plan_type_for_package(v_request.package_name);

  if v_credits is null or v_credits <= 0 then
    raise exception 'Invalid recharge package';
  end if;

  update public.profiles as p
  set credits = p.credits + v_credits,
      plan_type = v_plan_type
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

create or replace view public.users
with (security_invoker = true)
as
select
  p.id as user_id,
  p.email,
  p.credits as remaining_chats,
  p.plan_type,
  p.created_at
from public.profiles as p;

create or replace view public.chat
with (security_invoker = true)
as
select
  user_message.id as chat_id,
  user_message.user_id,
  user_message.content as prompt,
  assistant_message.content as response,
  1 as credits_used,
  user_message.created_at
from public.chat_messages as user_message
left join lateral (
  select cm.content
  from public.chat_messages as cm
  where cm.session_id = user_message.session_id
    and cm.user_id = user_message.user_id
    and cm.role = 'assistant'
    and cm.created_at >= user_message.created_at
  order by cm.created_at asc
  limit 1
) as assistant_message on true
where user_message.role = 'user';

revoke all on function public.plan_type_for_package(text) from public;
revoke all on function public.recharge_credits_for_package(text) from public;
revoke all on function public.check_chat_rate_limit(integer) from public;
revoke all on function public.save_chat_exchange(text, uuid, text, text, text) from public;
revoke all on function public.grant_signup_free_credits_if_eligible(uuid) from public;
revoke all on function public.complete_stripe_payment_order(text) from public;
revoke all on function public.admin_approve_recharge(uuid) from public;

grant execute on function public.plan_type_for_package(text) to authenticated;
grant execute on function public.recharge_credits_for_package(text) to authenticated;
grant execute on function public.check_chat_rate_limit(integer) to authenticated;
grant execute on function public.save_chat_exchange(text, uuid, text, text, text) to authenticated;
grant execute on function public.grant_signup_free_credits_if_eligible(uuid) to authenticated;
grant execute on function public.complete_stripe_payment_order(text) to service_role;
grant execute on function public.admin_approve_recharge(uuid) to authenticated;

grant select on public.users to authenticated;
grant select on public.chat to authenticated;

notify pgrst, 'reload schema';

commit;
