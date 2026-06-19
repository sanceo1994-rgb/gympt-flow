# Working agreement for AI coding agents (Codex, Claude Code, etc.)

This project is worked on by switching between multiple AI coding tools (e.g. Codex
and Claude Code) in the same local folder. Follow these rules so that switching
tools mid-task never causes lost work, confusion, or database drift.

## 1. Commit early, commit often

- Commit as soon as a coherent unit of work is done (one fix, one feature slice) —
  do not wait until the entire task is finished.
- Commits are local and instant: they do not depend on network access or on how
  much of your token/usage budget is left. They are the actual protection against
  a session cutting off mid-task, not pushing.
- Use small, descriptive commits over one giant commit at the end.

## 2. Always check state at the start of a session

- Before starting new work, run `git status` and `git diff` to see whether the
  previous session (whichever tool ran it) left uncommitted changes.
- Treat uncommitted changes as in-progress work, not garbage: read them, figure out
  whether they were a deliberate edit or a partial/interrupted change, and decide
  whether to finish, commit, or fix them before starting something new.
- Do not discard or overwrite uncommitted changes without understanding what they
  are first.

## 3. Database schema changes go through migrations only

- All Supabase schema changes (tables, columns, RLS policies, functions, triggers)
  must be made as a new file under `supabase/migrations/` and applied with
  `supabase db push`.
- Never run schema-changing SQL directly in the Supabase Studio SQL Editor. Doing
  so changes the live database but does not record anything in the CLI's
  migration history table, which causes the next `db push` (from either tool) to
  fail with "already exists" errors or, worse, silently diverge from what the
  migration files describe.
- If schema SQL absolutely had to be run directly (e.g. urgent hotfix), immediately
  add/adjust the corresponding migration file and run
  `supabase migration repair --status applied <version>` so the CLI history matches
  reality before anyone pushes again.
- Before pushing, run `supabase migration list` to compare local vs remote and make
  sure there's no unexplained gap.

## 4. Pushing to GitHub

- Pushing to the remote (`git push`) is for backup/visibility/PRs, not for
  continuity between tool sessions — the working tree itself is shared on disk.
  Still, push regularly so work isn't only sitting locally.
