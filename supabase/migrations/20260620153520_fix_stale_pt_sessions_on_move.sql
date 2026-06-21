-- confirm_weekly_schedule cleared the old confirmed student_selections row when a
-- student was moved to a new slot, but never cleared the corresponding pt_sessions
-- row at the old time. That left a "ghost" scheduled session behind every time a
-- student's slot was changed, so the student's PT history could show times that no
-- longer matched the trainer's current schedule view.
drop function if exists public.confirm_weekly_schedule(uuid, jsonb, boolean);

create or replace function public.confirm_weekly_schedule(
  p_schedule_id uuid,
  p_assignments jsonb,
  p_mark_week_confirmed boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_week_start date;
  v_stale jsonb;
begin
  select t.id, s.week_start
    into v_trainer_id, v_week_start
  from public.weekly_schedules s
  join public.trainer_profiles tp on tp.id = s.trainer_id
  join public.trainers t on t.user_id = tp.user_id
  where s.id = p_schedule_id
    and tp.user_id = auth.uid();

  if v_trainer_id is null then
    raise exception 'not_authorized_or_not_found';
  end if;

  -- Snapshot the confirmed slots about to be replaced *before* deleting them,
  -- so we can also clear their stale pt_sessions rows further down.
  select coalesce(jsonb_agg(jsonb_build_object(
           'student_user_id', sel.student_user_id,
           'slot_id', sel.slot_id
         )), '[]'::jsonb)
    into v_stale
  from public.student_selections sel
  join jsonb_array_elements(p_assignments) as rec
    on sel.student_user_id = (rec->>'student_user_id')::uuid
  where sel.schedule_id = p_schedule_id
    and sel.status = 'confirmed'
    and sel.slot_id is distinct from (rec->>'slot_id')::uuid;

  -- A moved student's old confirmed slot must be cleared first, otherwise
  -- they'd end up "confirmed" at both the old and new slot (inflating the
  -- demand heatmap and leaving a stale row pt_sessions can't reconcile).
  delete from public.student_selections sel
  using jsonb_array_elements(v_stale) as rec
  where sel.schedule_id = p_schedule_id
    and sel.student_user_id = (rec->>'student_user_id')::uuid
    and sel.slot_id = (rec->>'slot_id')::uuid;

  with incoming as (
    select
      (rec->>'slot_id')::uuid as slot_id,
      (rec->>'student_user_id')::uuid as student_user_id,
      rec->>'student_name' as student_name,
      coalesce(rec->>'method', 'auto') as method
    from jsonb_array_elements(p_assignments) as rec
  ),
  upsert_selection as (
    update public.student_selections sel
    set status = 'confirmed', assigned_method = i.method
    from incoming i
    where sel.schedule_id = p_schedule_id
      and sel.slot_id = i.slot_id
      and sel.student_user_id = i.student_user_id
    returning sel.slot_id, sel.student_user_id
  ),
  missing as (
    select i.*
    from incoming i
    left join upsert_selection u
      on u.slot_id = i.slot_id and u.student_user_id = i.student_user_id
    where u.slot_id is null
  )
  insert into public.student_selections (
    schedule_id, slot_id, student_user_id, student_name, status, assigned_method
  )
  select p_schedule_id, slot_id, student_user_id, student_name, 'confirmed', method
  from missing;

  with incoming as (
    select
      (rec->>'slot_id')::uuid as slot_id,
      (rec->>'student_user_id')::uuid as student_user_id
    from jsonb_array_elements(p_assignments) as rec
  ),
  resolved as (
    select
      i.student_user_id,
      r.id as roster_id,
      (v_week_start + ts.day_of_week * interval '1 day' + ts.hour * interval '1 hour') as scheduled_at
    from incoming i
    join public.time_slots ts on ts.id = i.slot_id
    join public.student_rosters r on r.trainer_id = v_trainer_id and r.student_user_id = i.student_user_id
  )
  insert into public.pt_sessions (trainer_id, roster_id, student_user_id, scheduled_at, status)
  select v_trainer_id, roster_id, student_user_id, scheduled_at, 'scheduled'
  from resolved
  on conflict (roster_id, scheduled_at) do update set
    student_user_id = excluded.student_user_id,
    status = 'scheduled';

  -- Clear the ghost pt_sessions row left behind at the student's previous
  -- slot time, so the trainer's confirmed schedule and the student's PT
  -- history always agree.
  delete from public.pt_sessions ps
  using (
    select
      r.id as roster_id,
      (v_week_start + ts.day_of_week * interval '1 day' + ts.hour * interval '1 hour') as scheduled_at
    from jsonb_array_elements(v_stale) as rec
    join public.time_slots ts on ts.id = (rec->>'slot_id')::uuid
    join public.student_rosters r
      on r.trainer_id = v_trainer_id
      and r.student_user_id = (rec->>'student_user_id')::uuid
  ) old_sessions
  where ps.trainer_id = v_trainer_id
    and ps.roster_id = old_sessions.roster_id
    and ps.scheduled_at = old_sessions.scheduled_at
    and ps.status = 'scheduled';

  if p_mark_week_confirmed then
    update public.weekly_schedules set confirmed_at = now() where id = p_schedule_id;
  end if;
end;
$$;

revoke all on function public.confirm_weekly_schedule(uuid, jsonb, boolean) from public, anon;
grant execute on function public.confirm_weekly_schedule(uuid, jsonb, boolean) to authenticated;

select pg_notify('pgrst', 'reload schema');
