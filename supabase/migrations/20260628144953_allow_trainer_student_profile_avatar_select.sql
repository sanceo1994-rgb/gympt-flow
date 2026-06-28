-- profiles only had a "select own row" policy, so a trainer's query for their
-- students' profiles.avatar_url (schedule.tsx, profile.tsx) always came back
-- empty under RLS — real Kakao profile photos never reached the trainer-side
-- UI even though the column itself was populated correctly at signup.
drop policy if exists "profiles_select_own_students" on public.profiles;
create policy "profiles_select_own_students" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.student_rosters r
      join public.trainers t on t.id = r.trainer_id
      where r.student_user_id = profiles.id
        and t.user_id = auth.uid()
    )
  );
