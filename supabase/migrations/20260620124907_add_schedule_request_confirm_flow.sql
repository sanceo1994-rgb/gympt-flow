alter table public.weekly_schedules
  add column if not exists request_sent_at timestamptz,
  add column if not exists confirmed_at timestamptz;

create or replace function public.mark_schedule_requested(p_schedule_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.weekly_schedules s
  set request_sent_at = coalesce(s.request_sent_at, now())
  from public.trainer_profiles tp
  where s.id = p_schedule_id
    and tp.id = s.trainer_id
    and tp.user_id = auth.uid();

  if not found then
    raise exception 'not_authorized_or_not_found';
  end if;
end;
$$;

revoke all on function public.mark_schedule_requested(uuid) from public, anon;
grant execute on function public.mark_schedule_requested(uuid) to authenticated;

create or replace function public.confirm_weekly_schedule(p_schedule_id uuid, p_assignments jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
  v_week_start date;
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

  with incoming as (
    select
      (rec->>'slot_id')::uuid as slot_id,
      (rec->>'student_user_id')::uuid as student_user_id,
      rec->>'student_name' as student_name
    from jsonb_array_elements(p_assignments) as rec
  ),
  upsert_selection as (
    update public.student_selections sel
    set status = 'confirmed'
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
  insert into public.student_selections (schedule_id, slot_id, student_user_id, student_name, status)
  select p_schedule_id, slot_id, student_user_id, student_name, 'confirmed'
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

  update public.weekly_schedules set confirmed_at = now() where id = p_schedule_id;
end;
$$;

revoke all on function public.confirm_weekly_schedule(uuid, jsonb) from public, anon;
grant execute on function public.confirm_weekly_schedule(uuid, jsonb) to authenticated;

select pg_notify('pgrst', 'reload schema');
