-- handle_new_user() only ever read raw_user_meta_data->>'avatar_url'. Kakao's
-- OAuth provider sometimes only populates the 'picture' key (no 'avatar_url'),
-- so profiles.avatar_url silently stayed null for some Kakao sign-ups even
-- though their real photo was sitting right there in auth.users metadata.
-- Make the trigger fall back to 'picture', and backfill existing rows once.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles p
set avatar_url = coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') is not null;
