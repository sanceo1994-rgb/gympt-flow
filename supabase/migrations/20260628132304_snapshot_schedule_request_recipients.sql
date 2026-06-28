create table if not exists public.schedule_request_recipients (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.weekly_schedules(id) on delete cascade,
  roster_id uuid references public.student_rosters(id) on delete set null,
  student_user_id uuid,
  student_name text not null,
  created_at timestamptz not null default now()
);

alter table public.schedule_request_recipients enable row level security;

create unique index if not exists schedule_request_recipients_schedule_roster_uidx
  on public.schedule_request_recipients(schedule_id, roster_id)
  where roster_id is not null;

create unique index if not exists schedule_request_recipients_schedule_user_uidx
  on public.schedule_request_recipients(schedule_id, student_user_id)
  where student_user_id is not null;

create index if not exists schedule_request_recipients_schedule_idx
  on public.schedule_request_recipients(schedule_id);

create index if not exists schedule_request_recipients_student_user_idx
  on public.schedule_request_recipients(student_user_id);

insert into public.schedule_request_recipients (
  schedule_id,
  roster_id,
  student_user_id,
  student_name,
  created_at
)
select
  s.id,
  r.id,
  r.student_user_id,
  r.student_name,
  coalesce(s.request_sent_at, now())
from public.weekly_schedules s
join public.trainer_profiles tp on tp.id = s.trainer_id
join public.trainers t on t.user_id = tp.user_id
join public.student_rosters r on r.trainer_id = t.id
where s.request_sent_at is not null
  and r.remaining_sessions > 0
on conflict do nothing;

drop policy if exists "schedule_request_recipients_select_related" on public.schedule_request_recipients;
create policy "schedule_request_recipients_select_related" on public.schedule_request_recipients
for select to authenticated using (
  auth.uid() = student_user_id
  or exists (
    select 1
    from public.weekly_schedules s
    join public.trainer_profiles tp on tp.id = s.trainer_id
    where s.id = schedule_request_recipients.schedule_id
      and tp.user_id = auth.uid()
  )
);

drop policy if exists "schedule_request_recipients_insert_trainer" on public.schedule_request_recipients;
create policy "schedule_request_recipients_insert_trainer" on public.schedule_request_recipients
for insert to authenticated with check (
  exists (
    select 1
    from public.weekly_schedules s
    join public.trainer_profiles tp on tp.id = s.trainer_id
    where s.id = schedule_request_recipients.schedule_id
      and tp.user_id = auth.uid()
  )
);

drop policy if exists "schedule_request_recipients_delete_trainer" on public.schedule_request_recipients;
create policy "schedule_request_recipients_delete_trainer" on public.schedule_request_recipients
for delete to authenticated using (
  exists (
    select 1
    from public.weekly_schedules s
    join public.trainer_profiles tp on tp.id = s.trainer_id
    where s.id = schedule_request_recipients.schedule_id
      and tp.user_id = auth.uid()
  )
);

drop policy if exists "selections_insert_own" on public.student_selections;
create policy "selections_insert_own" on public.student_selections
for insert to authenticated with check (
  auth.uid() = student_user_id
  and (
    not exists (
      select 1
      from public.weekly_schedules s
      where s.id = student_selections.schedule_id
        and s.request_sent_at is not null
    )
    or exists (
      select 1
      from public.schedule_request_recipients r
      where r.schedule_id = student_selections.schedule_id
        and r.student_user_id = auth.uid()
    )
  )
);

drop function if exists public.mark_schedule_requested(uuid);
drop function if exists public.mark_schedule_requested(uuid, uuid[]);

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

  delete from public.schedule_request_recipients
  where schedule_id = p_schedule_id;

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

revoke all on function public.mark_schedule_requested(uuid, uuid[]) from public, anon;
grant execute on function public.mark_schedule_requested(uuid, uuid[]) to authenticated;

select pg_notify('pgrst', 'reload schema');
