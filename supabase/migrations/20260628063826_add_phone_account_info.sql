-- Lets the signup form show "이미 가입한 계정입니다" with the existing
-- account's signup method + masked email *before* sending an OTP, instead of
-- only warning after the fact (phone_exists only returns a boolean and the
-- old check was Kakao-only — see RightRail/login phoneDuplicate banner).
create or replace function public.phone_account_info(check_phone text)
returns table (email text, provider text)
language sql
security definer
set search_path = public
as $$
  select
    u.email,
    coalesce(u.raw_app_meta_data->>'provider', 'email') as provider
  from auth.users u
  where u.raw_user_meta_data->>'phone' = check_phone
  order by u.created_at asc
  limit 1;
$$;

revoke all on function public.phone_account_info(text) from public;
grant execute on function public.phone_account_info(text) to anon, authenticated;
