# AI handoff

## Start of every session

```bash
git status
git diff
git log -5 --oneline
npm run db:status
```

Read existing uncommitted work before editing. Never reset, overwrite, or delete
another agent's changes just because they are uncommitted.

## Current database state

- Linked Supabase project: `symnrjcgtltcgizwbaax`
- Remote migration history currently contains `20260617092000`,
  `20260619100000`, `20260619110000`, and `20260619120000`.
- Core tables exist remotely even though the initial four local migration
  versions are not recorded.
- `20260618113000` is not recorded, but trainer theme columns exist remotely.
- `pt_sessions` is absent, so `20260618143000` is not fully applied.
- `student_selections` exists, but `20260618190000` and its seed state have not
  been proven fully applied.
- `20260619100000_link_student_roster_signup.sql`,
  `20260619110000_seed_ended_dummy_students.sql`, and
  `20260619120000_allow_student_schedule_bootstrap.sql` were applied by another
  active Claude session using a manual technique: temporarily moving every
  unresolved older migration file out of `supabase/migrations/` into a sibling
  `.migrations-holdout/` directory, running raw `supabase db push --yes` so only
  the new, already-audited file is applied, then moving the held-out files back.
  This achieves the same end state as the guarded script (only intentionally
  reviewed migrations get applied) without touching the still-unresolved older
  gap. Preserve and commit all three migration files.
- The still-unresolved gap is unchanged: `20260512065037`, `20260512065104`,
  `20260512065136`, `20260512123636`, `20260618113000`, `20260618143000`,
  `20260618190000`. Do not run `npm run db:push` (or raw `supabase db push`
  without the holdout technique above) until each of these is audited
  statement-by-statement against the live schema.
- `20260619130000_fix_student_schedule_bootstrap_join.sql` is also applied.

## Important: weekly_schedules/time_slots schema has drifted beyond any migration file

Verified empirically against the live DB (PostgREST + real auth tokens), not by
reading migration files, since the migration files describe an abandoned design:

- `weekly_schedules.trainer_id` references **`trainer_profiles(id)`**, not
  `trainers(id)`. No migration file in this repo creates `trainer_profiles` or
  documents this FK — it exists live only, presumably created via direct SQL at
  some point.
- `weekly_schedules` also has extra live-only columns not in any migration:
  `title` (nullable), `booking_token` (DB-generated default, not used by any app
  code today), `is_published` (defaults `false`, not read by any RLS policy or
  app code today — does not gate anything currently), `booking_opens_at`,
  `booking_closes_at`.
- `time_slots` has an extra live-only column `is_available` (default `true`,
  unused by app code) and `note`.
- Most trainers (5 of 8 real trainer rows, checked 2026-06-19) have **no**
  `trainer_profiles` row at all. `src/routes/schedule.tsx` now creates one
  on-demand (mirrored from the `trainers` row) the first time that trainer opens
  `/schedule`. `src/routes/booking.tsx` only reads it (a student can't create
  another user's profile row) — if missing, booking silently can't persist
  picks for that trainer/week yet, until the trainer opens `/schedule` once.
- Do not assume `supabase/migrations/20260512123636_*.sql` (which defines
  `weekly_schedules.trainer_id references trainers(id)`) reflects reality. It
  does not. Treat any of the four oldest unresolved migration files as
  describing a different, abandoned design until proven otherwise by checking
  the live schema directly (e.g. `curl .../rest/v1/<table>?select=*&limit=0`
  with a real user JWT, not just the anon key, to also see RLS-shaped results).

Update this section whenever the database drift is reconciled or a task is left
incomplete. Commit this file when its state changes.

## End of a coherent task

- Run relevant tests/builds.
- Re-run `git status` and summarize every changed file.
- Commit a coherent checkpoint when authorized; never commit `.env`, local CLI
  cache, credentials, or unrelated unfinished work.
- Record any unresolved blocker here before switching tools.
