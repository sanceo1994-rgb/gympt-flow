-- pt_sessions and the selection_status enum / student_selections table were
-- supposed to be created by 20260618143000_add_pt_sessions_and_demo_schedule.sql,
-- but that file was never actually pushed to the remote DB (confirmed via direct
-- REST probing: GET /rest/v1/pt_sessions returned PGRST205 "table not found").
-- student_selections already exists on remote, so that part is a no-op here;
-- pt_sessions does not, so this is what actually creates it. The original
-- file's demo-seed inserts (tied to one hardcoded test trainer id) are
-- intentionally omitted — only the schema/RLS/index statements are re-run here.

create table if not exists public.pt_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  roster_id uuid not null references public.student_rosters(id) on delete cascade,
  student_user_id uuid,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (roster_id, scheduled_at)
);

alter table public.pt_sessions enable row level security;

drop policy if exists "pt_sessions_select_student_or_trainer" on public.pt_sessions;
create policy "pt_sessions_select_student_or_trainer" on public.pt_sessions
for select to authenticated using (
  auth.uid() = student_user_id
  or exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.user_id = auth.uid()
  )
);

drop policy if exists "pt_sessions_write_trainer" on public.pt_sessions;
create policy "pt_sessions_write_trainer" on public.pt_sessions
for all to authenticated using (
  exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.user_id = auth.uid()
  )
);

drop trigger if exists pt_sessions_touch on public.pt_sessions;
create trigger pt_sessions_touch before update on public.pt_sessions
for each row execute function public.touch_updated_at();

create index if not exists pt_sessions_student_idx on public.pt_sessions(student_user_id, scheduled_at);
create index if not exists pt_sessions_trainer_idx on public.pt_sessions(trainer_id, scheduled_at);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'selection_status') then
    create type public.selection_status as enum ('selected', 'unavailable', 'confirmed');
  end if;
end
$$;

create table if not exists public.student_selections (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.time_slots(id) on delete cascade,
  schedule_id uuid not null references public.weekly_schedules(id) on delete cascade,
  student_user_id uuid not null,
  student_name text not null,
  status public.selection_status not null default 'selected',
  created_at timestamptz not null default now()
);

alter table public.student_selections enable row level security;

drop policy if exists "selections_select_own_or_trainer" on public.student_selections;
create policy "selections_select_own_or_trainer" on public.student_selections
for select to authenticated using (
  auth.uid() = student_user_id
  or exists (
    select 1 from public.weekly_schedules s
    join public.trainer_profiles tp on tp.id = s.trainer_id
    where s.id = schedule_id and tp.user_id = auth.uid()
  )
);

drop policy if exists "selections_insert_own" on public.student_selections;
create policy "selections_insert_own" on public.student_selections
for insert to authenticated with check (auth.uid() = student_user_id);

drop policy if exists "selections_delete_own" on public.student_selections;
create policy "selections_delete_own" on public.student_selections
for delete to authenticated using (auth.uid() = student_user_id);

create index if not exists student_selections_schedule_idx on public.student_selections(schedule_id);
create index if not exists student_selections_slot_idx on public.student_selections(slot_id);

select pg_notify('pgrst', 'reload schema');
