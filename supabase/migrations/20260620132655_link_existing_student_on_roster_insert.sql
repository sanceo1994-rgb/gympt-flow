-- Phone entered as user metadata is not verified and must never grant roster access.
-- Only Supabase Auth's verified phone column can link by phone. Email and UUID
-- linkage remain supported for existing accounts.

create or replace function public.link_student_roster_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verified_phone text := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
begin
  update public.student_rosters
  set student_user_id = new.id,
      student_email = coalesce(student_email, new.email),
      updated_at = now()
  where student_user_id is distinct from new.id
    and (
      (new.email is not null and student_email is not null and lower(student_email) = lower(new.email))
      or (
        verified_phone <> ''
        and regexp_replace(coalesce(student_phone, ''), '[^0-9]', '', 'g') = verified_phone
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
  where u.phone is not null
    and regexp_replace(u.phone, '[^0-9]', '', 'g') = normalized_phone
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

drop policy if exists "student_rosters_select_related" on public.student_rosters;
create policy "student_rosters_select_related" on public.student_rosters
  for select to authenticated
  using (
    student_user_id = auth.uid()
    or (student_email is not null and lower(student_email) = lower(coalesce(auth.email(), '')))
    or exists (
      select 1
      from public.trainers t
      where t.id = trainer_id and t.user_id = auth.uid()
    )
  );

select pg_notify('pgrst', 'reload schema');
