-- 20260620132655_link_existing_student_on_roster_insert.sql restricted phone
-- matching to auth.users.phone (Supabase's SMS-verified column) to prevent
-- someone from claiming a roster row by typing another person's phone
-- number at signup. This app now has an SMS verification flow, but existing
-- self-reported metadata still needs to be considered so previously stuck
-- roster rows can link correctly.

create or replace function public.link_student_roster_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text := regexp_replace(
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone', ''),
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
        normalized_phone <> ''
        and regexp_replace(coalesce(student_phone, ''), '[^0-9]', '', 'g') = normalized_phone
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
          coalesce(u.phone, u.raw_user_meta_data ->> 'phone', ''),
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

-- Backfill roster rows that were stuck unlinked because the old trigger
-- version never matched self-reported phone numbers.
update public.student_rosters r
set student_user_id = u.id,
    student_email = coalesce(r.student_email, u.email),
    updated_at = now()
from auth.users u
where r.student_user_id is distinct from u.id
  and regexp_replace(coalesce(r.student_phone, ''), '[^0-9]', '', 'g') <> ''
  and regexp_replace(coalesce(r.student_phone, ''), '[^0-9]', '', 'g') = regexp_replace(
        coalesce(u.phone, u.raw_user_meta_data ->> 'phone', ''),
        '[^0-9]',
        '',
        'g'
      );

select pg_notify('pgrst', 'reload schema');
