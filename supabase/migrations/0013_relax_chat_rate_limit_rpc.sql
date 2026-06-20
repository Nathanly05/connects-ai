begin;

drop function if exists public.check_chat_rate_limit(integer);

create or replace function public.check_chat_rate_limit(p_credit_cost integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return true;
end;
$$;

revoke all on function public.check_chat_rate_limit(integer) from public;
grant execute on function public.check_chat_rate_limit(integer) to authenticated;
grant execute on function public.check_chat_rate_limit(integer) to service_role;

notify pgrst, 'reload schema';

commit;
