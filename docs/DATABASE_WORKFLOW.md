# Supabase database workflow

This repository uses the Supabase CLI migration history as the single source of
truth for database schema changes. Codex, Claude Code, developers, and CI must
use the same commands below.

## Normal schema change

1. Check the shared working tree and remote migration history.

   ```bash
   git status
   git diff
   npm run db:status
   ```

2. Create a migration. Do not create timestamped files by hand.

   ```bash
   npm run db:new -- add_descriptive_name
   ```

3. Edit only the newly created file under `supabase/migrations/`. Prefer
   forward-only, rerunnable SQL where practical (`if exists`, `if not exists`,
   guarded policy replacement, deterministic seeds).

4. Review without modifying the remote database.

   ```bash
   npm run db:push:dry
   ```

5. Apply through the guarded command.

   ```bash
   npm run db:push
   ```

6. Commit the migration together with the application code that depends on it.

## Supabase Studio SQL Editor policy

- Allowed by default: `select`, diagnostics, and read-only inspection.
- Not allowed: schema DDL, RLS/policy changes, functions, triggers, grants, or
  production seed writes.
- Do not copy a migration into SQL Editor as a substitute for `npm run db:push`.

## Emergency direct-SQL recovery

Direct schema SQL is an exceptional incident, not a normal workflow.

1. Stop all database pushes.
2. Save the exact SQL as a migration file.
3. Audit every statement against the remote schema. Table existence alone does
   not prove that policies, functions, constraints, triggers, and seed rows were
   applied.
4. Only when the full migration is confirmed present, record it with:

   ```bash
   npx supabase migration repair --status applied <14-digit-version> --linked
   ```

5. Run `npm run db:status` and `npm run db:push:dry` again.

Never mark a partially applied migration as applied. Complete or reverse the
partial state with a reviewed reconciliation migration first.

## Current known block (2026-06-19)

The remote history currently records `20260617092000` and `20260619100000`,
while older local baseline migrations and later SQL Editor changes exist in the remote schema.
The guarded push command intentionally blocks until this history is audited and
repaired. See `docs/AI_HANDOFF.md` before doing database work.
