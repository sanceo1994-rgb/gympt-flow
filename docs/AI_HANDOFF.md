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
- Last checked with `npm run db:push` on 2026-06-29.
- Remote migration history now matches every local migration from
  `20260512065037` through `20260622015032`; the workflow reports no unexplained
  historical migration gap.
- Remote migration history currently matches local through
  `20260629130011_add_popular_gym_rank.sql`.
- `20260629121227` adds trainer subscription plans (`Free`, `Mini`, `Basic`,
  `Pro`), stores each trainer's `subscription_plan`, enforces active student
  limits on `student_rosters`, and seeds 8,839 deduplicated gyms from
  `C:\dev\crawling\crawling_gym.xlsx` into `public.gyms`.
- `20260629130011` adds `gyms.popularity_rank` for manually curated popular
  gym ordering and seeds ranks 1-5 for the current onboarding search defaults.
- `20260628132304` adds `schedule_request_recipients` and updates
  `mark_schedule_requested` so each time-selection request snapshots the roster
  recipients that were selected at send time. Booking and profile screens now
  read that snapshot so students added later do not inherit old requests.
- `20260628134632` fixes student roster signup linking after `auth.users.phone`
  started being stored as E.164 (`+8210...`). Roster linking and phone-account
  lookup now compare the normalized `auth.users.raw_user_meta_data->>'phone'`
  value, and the migration backfills existing roster rows that were incorrectly
  left unlinked/misclassified as unregistered.
- Continue using `npm run db:status`, `npm run db:push:dry`, and
  `npm run db:push` for database work. Do not bypass the guarded npm workflow.

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
