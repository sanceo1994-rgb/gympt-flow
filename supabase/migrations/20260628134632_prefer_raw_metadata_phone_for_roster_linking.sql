-- auth.users.phone is now stored as E.164 (for Supabase Auth), while roster
-- rows and onboarding metadata keep the local Korean display format. Use the
-- verified onboarding metadata phone as the roster identity source so
-- "+8210..." in auth.users.phone does not hide "010-..." in raw_user_meta_data.

create or replace function public.link_student_roster_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_phone text := regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    '[^0-9]',
    '',
    'g'
  );
begin
  update public.student_rosters
  set student_user_id = new.id,
      student_email = coalesce(student_email, new.email),
      updated_at = now()
  where student_user_id is distinct from new.id
    and (
      (new.email is not null and student_email is not null and lower(student_email) = lower(new.email))
      or (
        metadata_phone <> ''
        and regexp_replace(coalesce(student_phone, ''), '[^0-9]', '', 'g') = metadata_phone
      )
    );
  return new;
end;
$$;

create or replace function public.link_existing_student_on_roster_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_user_id uuid;
  matched_email text;
  normalized_phone text := regexp_replace(coalesce(new.student_phone, ''), '[^0-9]', '', 'g');
begin
  if new.student_user_id is not null or normalized_phone = '' then
    return new;
  end if;

  select u.id, u.email
  into matched_user_id, matched_email
  from auth.users u
  where regexp_replace(
          coalesce(u.raw_user_meta_data ->> 'phone', ''),
          '[^0-9]',
          '',
          'g'
        ) = normalized_phone
  order by u.created_at asc
  limit 1;

  if matched_user_id is not null then
    new.student_user_id := matched_user_id;
    new.student_email := coalesce(new.student_email, matched_email);
  end if;
  return new;
end;
$$;

drop trigger if exists before_student_roster_insert_link_user on public.student_rosters;
create trigger before_student_roster_insert_link_user
before insert or update of student_phone on public.student_rosters
for each row execute function public.link_existing_student_on_roster_insert();

create or replace function public.phone_exists(check_phone text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where regexp_replace(coalesce(u.raw_user_meta_data->>'phone', ''), '[^0-9]', '', 'g')
      = regexp_replace(coalesce(check_phone, ''), '[^0-9]', '', 'g')
  );
$$;

revoke all on function public.phone_exists(text) from public;
grant execute on function public.phone_exists(text) to anon, authenticated;

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
  where regexp_replace(coalesce(u.raw_user_meta_data->>'phone', ''), '[^0-9]', '', 'g')
    = regexp_replace(coalesce(check_phone, ''), '[^0-9]', '', 'g')
  order by u.created_at asc
  limit 1;
$$;

revoke all on function public.phone_account_info(text) from public;
grant execute on function public.phone_account_info(text) to anon, authenticated;

update public.student_rosters r
set student_user_id = u.id,
    student_email = coalesce(r.student_email, u.email),
    updated_at = now()
from auth.users u
where r.student_user_id is distinct from u.id
  and regexp_replace(coalesce(r.student_phone, ''), '[^0-9]', '', 'g') <> ''
  and regexp_replace(coalesce(r.student_phone, ''), '[^0-9]', '', 'g') = regexp_replace(
        coalesce(u.raw_user_meta_data ->> 'phone', ''),
        '[^0-9]',
        '',
        'g'
      );

select pg_notify('pgrst', 'reload schema');
