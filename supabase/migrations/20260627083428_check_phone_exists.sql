-- Lets onboarding (especially Kakao signup, which often has no real email
-- from Kakao) detect "this phone number already has an account" before
-- creating a second, disconnected auth user for the same person.
create or replace function public.phone_exists(check_phone text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users where raw_user_meta_data->>'phone' = check_phone
  );
$$;

revoke all on function public.phone_exists(text) from public;
grant execute on function public.phone_exists(text) to anon, authenticated;
