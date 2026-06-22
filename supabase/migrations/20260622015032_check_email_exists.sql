-- Lets the /login screen tell "wrong password" apart from "no such account"
-- without exposing anything about the account beyond existence.
create or replace function public.email_exists(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(check_email)
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
