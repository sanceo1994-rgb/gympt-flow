from pathlib import Path
import math
import re

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "supabase" / "migrations" / "20260629121227_add_subscription_plans_and_gyms.sql"
XLSX = Path(r"C:\dev\crawling\crawling_gym.xlsx")


def clean(value):
    if pd.isna(value):
        return None
    text = str(value).strip()
    if text.endswith(".0") and re.fullmatch(r"\d+\.0", text):
        text = text[:-2]
    return text or None


def sql_string(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_number(value):
    if pd.isna(value):
        return "null"
    try:
        number = float(value)
    except Exception:
        return "null"
    if math.isnan(number):
        return "null"
    return repr(number)


def normalize_phone(value):
    text = clean(value)
    if not text:
        return None
    digits = re.sub(r"\D+", "", text)
    if digits and not digits.startswith("0"):
        digits = "0" + digits
    return digits or None


def build_gym_rows():
    frame = pd.read_excel(XLSX, sheet_name=0)
    columns = list(frame.columns)
    rows_by_key = {}
    for _, row in frame.iterrows():
        sido = clean(row[columns[0]])
        district = clean(row[columns[1]])
        dong = clean(row[columns[2]])
        name = clean(row[columns[3]])
        address = clean(row[columns[4]])
        if not name or not address:
            continue
        search = " ".join(part for part in [name, address, sido, district, dong] if part)
        rows_by_key[(name, address)] = (
            "("
            + ", ".join(
                [
                    sql_string(sido),
                    sql_string(district),
                    sql_string(dong),
                    sql_string(name),
                    sql_string(address),
                    sql_string(normalize_phone(row[columns[5]])),
                    sql_number(row[columns[6]]),
                    sql_number(row[columns[7]]),
                    sql_number(row[columns[8]]),
                    sql_string(search),
                ]
            )
            + ")"
        )
    return list(rows_by_key.values())


def chunked_insert(rows):
    chunks = []
    for start in range(0, len(rows), 500):
        values = ",\n".join(rows[start : start + 500])
        chunks.append(
            "insert into public.gyms "
            "(sido, district, dong, name, address, phone, walking_distance, latitude, longitude, search_text) values\n"
            + values
            + "\non conflict (name, address) do update set\n"
            + "  sido = excluded.sido,\n"
            + "  district = excluded.district,\n"
            + "  dong = excluded.dong,\n"
            + "  phone = excluded.phone,\n"
            + "  walking_distance = excluded.walking_distance,\n"
            + "  latitude = excluded.latitude,\n"
            + "  longitude = excluded.longitude,\n"
            + "  search_text = excluded.search_text,\n"
            + "  updated_at = now();"
        )
    return "\n\n".join(chunks)


def main():
    rows = build_gym_rows()
    sql = (
        """create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  monthly_price integer not null default 0,
  active_student_limit integer not null,
  monthly_alimtalk_limit integer not null,
  extra_alimtalk_100_price integer,
  extra_alimtalk_purchase_enabled boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_extra_price_check check (
    (extra_alimtalk_purchase_enabled and extra_alimtalk_100_price is not null)
    or (not extra_alimtalk_purchase_enabled and extra_alimtalk_100_price is null)
  )
);

insert into public.subscription_plans (
  id, name, monthly_price, active_student_limit, monthly_alimtalk_limit,
  extra_alimtalk_100_price, extra_alimtalk_purchase_enabled, display_order
) values
  ('free', 'Free', 0, 3, 20, null, false, 10),
  ('mini', 'Mini', 19000, 5, 80, 3000, true, 20),
  ('basic', 'Basic', 39000, 10, 200, 2500, true, 30),
  ('pro', 'Pro', 79000, 20, 500, 2000, true, 40)
on conflict (id) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  active_student_limit = excluded.active_student_limit,
  monthly_alimtalk_limit = excluded.monthly_alimtalk_limit,
  extra_alimtalk_100_price = excluded.extra_alimtalk_100_price,
  extra_alimtalk_purchase_enabled = excluded.extra_alimtalk_purchase_enabled,
  display_order = excluded.display_order,
  updated_at = now();

alter table public.subscription_plans enable row level security;

drop policy if exists "subscription_plans_public_select" on public.subscription_plans;
create policy "subscription_plans_public_select" on public.subscription_plans
  for select to anon, authenticated
  using (true);

alter table public.trainers
  add column if not exists subscription_plan text not null default 'free';

alter table public.trainers
  drop constraint if exists trainers_subscription_plan_fkey;

alter table public.trainers
  add constraint trainers_subscription_plan_fkey
  foreign key (subscription_plan) references public.subscription_plans(id);

create index if not exists trainers_subscription_plan_idx on public.trainers(subscription_plan);

create or replace function public.current_trainer_active_student_limit(_trainer_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select p.active_student_limit
  from public.trainers t
  join public.subscription_plans p on p.id = coalesce(t.subscription_plan, 'free')
  where t.id = _trainer_id
$$;

create or replace function public.enforce_trainer_active_student_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if coalesce(new.remaining_sessions, 0) <= 0 then
    return new;
  end if;

  select p.active_student_limit
    into v_limit
  from public.trainers t
  join public.subscription_plans p on p.id = coalesce(t.subscription_plan, 'free')
  where t.id = new.trainer_id;

  if v_limit is null then
    v_limit := 3;
  end if;

  select count(*)
    into v_count
  from public.student_rosters r
  where r.trainer_id = new.trainer_id
    and r.id is distinct from new.id
    and coalesce(r.remaining_sessions, 0) > 0;

  if v_count + 1 > v_limit then
    raise exception 'active student limit exceeded for subscription plan'
      using errcode = 'P0001', detail = v_limit::text;
  end if;

  return new;
end;
$$;

drop trigger if exists student_rosters_enforce_active_limit on public.student_rosters;
create trigger student_rosters_enforce_active_limit
  before insert or update of trainer_id, remaining_sessions on public.student_rosters
  for each row execute function public.enforce_trainer_active_student_limit();

create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  sido text,
  district text,
  dong text,
  name text not null,
  address text not null,
  phone text,
  walking_distance numeric,
  latitude double precision,
  longitude double precision,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, address)
);

alter table public.gyms enable row level security;

drop policy if exists "gyms_public_select" on public.gyms;
create policy "gyms_public_select" on public.gyms
  for select to anon, authenticated
  using (true);

create index if not exists gyms_region_idx on public.gyms(sido, district, dong);

"""
        + chunked_insert(rows)
        + "\n\nselect pg_notify('pgrst', 'reload schema');\n"
    )
    MIGRATION.write_text(sql, encoding="utf-8")
    print(f"wrote {MIGRATION} with {len(rows)} gym rows")


if __name__ == "__main__":
    main()
