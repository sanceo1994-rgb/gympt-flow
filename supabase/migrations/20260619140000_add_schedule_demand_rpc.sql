-- student_selections RLS only lets a student read their own rows (or the
-- trainer read everything). That means the booking heatmap, which needs to
-- show how many *other* students picked each slot, has no legal way to read
-- that data directly. This function exposes only aggregate counts per slot
-- (no student identity) to the trainer or any of their registered students.
create or replace function public.get_schedule_demand(p_schedule_id uuid)
returns table (slot_id uuid, picks integer)
language sql
stable
security definer
set search_path = public
as $$
  select sel.slot_id, count(*)::integer as picks
  from public.student_selections sel
  join public.weekly_schedules s on s.id = sel.schedule_id
  join public.trainer_profiles tp on tp.id = s.trainer_id
  join public.trainers t on t.user_id = tp.user_id
  where sel.schedule_id = p_schedule_id
    and sel.slot_id is not null
    and sel.status <> 'unavailable'
    and (
      t.user_id = auth.uid()
      or exists (
        select 1 from public.student_rosters r
        where r.trainer_id = t.id
          and lower(r.student_email) = lower(coalesce(auth.email(), ''))
      )
    )
  group by sel.slot_id;
$$;

revoke execute on function public.get_schedule_demand(uuid) from public, anon;
grant execute on function public.get_schedule_demand(uuid) to authenticated;
