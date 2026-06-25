-- Student rosters are created before a member necessarily has an account.
-- auth.users.id remains the identity; a normalized phone only links a pending row.

alter table public.student_rosters
  alter column student_email drop not null;

alter table public.student_rosters
  drop constraint if exists student_rosters_trainer_id_student_email_key;

create unique index if not exists student_rosters_trainer_email_unique
  on public.student_rosters (trainer_id, lower(student_email))
  where student_email is not null and btrim(student_email) <> '';

create unique index if not exists student_rosters_trainer_phone_unique
  on public.student_rosters (trainer_id, regexp_replace(student_phone, '[^0-9]', '', 'g'))
  where student_phone is not null and regexp_replace(student_phone, '[^0-9]', '', 'g') <> '';

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

drop policy if exists "student_rosters_select_related" on public.student_rosters;
create policy "student_rosters_select_related" on public.student_rosters
  for select to authenticated
  using (
    student_user_id = auth.uid()
    or (student_email is not null and lower(student_email) = lower(coalesce(auth.email(), '')))
    or (
      regexp_replace(coalesce(student_phone, ''), '[^0-9]', '', 'g') <> ''
      and regexp_replace(coalesce(student_phone, ''), '[^0-9]', '', 'g') = regexp_replace(
        coalesce(auth.jwt() -> 'user_metadata' ->> 'phone', ''),
        '[^0-9]',
        '',
        'g'
      )
    )
    or exists (
      select 1
      from public.trainers t
      where t.id = trainer_id and t.user_id = auth.uid()
    )
  );

select pg_notify('pgrst', 'reload schema');
