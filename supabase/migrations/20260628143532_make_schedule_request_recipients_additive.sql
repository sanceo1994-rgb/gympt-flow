-- mark_schedule_requested used to delete every existing recipient row for the
-- schedule before re-inserting only the roster ids passed this call. That made
-- a scoped re-send (e.g. notifying just the students added after the original
-- blast) destructively drop everyone else from the recipient snapshot. Make it
-- additive: only ever insert the newly-requested roster ids, never delete.
create or replace function public.mark_schedule_requested(
  p_schedule_id uuid,
  p_roster_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid;
begin
  select t.id
    into v_trainer_id
  from public.weekly_schedules s
  join public.trainer_profiles tp on tp.id = s.trainer_id
  join public.trainers t on t.user_id = tp.user_id
  where s.id = p_schedule_id
    and tp.user_id = auth.uid();

  if v_trainer_id is null then
    raise exception 'not_authorized';
  end if;

  update public.weekly_schedules s
  set request_sent_at = coalesce(s.request_sent_at, now())
  where s.id = p_schedule_id;

  insert into public.schedule_request_recipients (
    schedule_id,
    roster_id,
    student_user_id,
    student_name
  )
  select
    p_schedule_id,
    r.id,
    r.student_user_id,
    r.student_name
  from public.student_rosters r
  where r.trainer_id = v_trainer_id
    and r.remaining_sessions > 0
    and (p_roster_ids is null or r.id = any(p_roster_ids))
  on conflict do nothing;
end;
$$;

select pg_notify('pgrst', 'reload schema');
