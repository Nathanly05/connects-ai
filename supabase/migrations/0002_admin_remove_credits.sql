begin;

create or replace function public.admin_remove_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text default '管理员手动扣减'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_reason text := coalesce(nullif(btrim(p_reason), ''), '管理员手动扣减');
begin
  if v_admin_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_admin_id
      and role = 'admin'
      and status = 'approved'
  ) then
    raise exception 'Only approved admins can remove credits';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.credits < p_amount then
    raise exception 'Credits cannot be less than 0';
  end if;

  update public.profiles
  set credits = credits - p_amount
  where id = p_user_id
  returning * into v_profile;

  insert into public.credit_logs (user_id, admin_id, amount, balance_after, reason)
  values (p_user_id, v_admin_id, -p_amount, v_profile.credits, v_reason);

  return v_profile;
end;
$$;

revoke all on function public.admin_remove_credits(uuid, integer, text) from public;
grant execute on function public.admin_remove_credits(uuid, integer, text) to authenticated;

commit;
