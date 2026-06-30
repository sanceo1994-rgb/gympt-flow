-- Tracks which onboarding tours a trainer has already completed/skipped, so
-- the spotlight tour only ever shows once per page (per trainer, not per
-- device/browser — a plain localStorage flag would re-show the tour after
-- clearing storage or signing in on a new device).
alter table public.trainers
  add column if not exists onboarding_seen text[] not null default '{}';
