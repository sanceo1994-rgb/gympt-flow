-- Before this session's fixes, manually reassigning a student (especially one
-- with no linked auth account, whose previous slot the client couldn't see)
-- could leave the old pt_sessions row behind instead of replacing it. That
-- produced duplicate "scheduled" rows for the same student in the same week —
-- visible as two PT times for one student, or two students crammed into one
-- slot once the demand views disagreed. Keep only the most recently
-- updated "scheduled" row per (roster, week) and drop the rest.
with ranked as (
  select
    id,
    row_number() over (
      partition by roster_id, date_trunc('week', scheduled_at)
      order by updated_at desc, created_at desc
    ) as rn
  from public.pt_sessions
  where status = 'scheduled'
)
delete from public.pt_sessions ps
using ranked r
where ps.id = r.id
  and r.rn > 1;
