-- Dummy "PT 종료" (signed up, 0 remaining sessions) students for UI/status testing.
-- student_user_id has no FK constraint on auth.users, so a random uuid is fine here
-- to simulate "already signed up" without needing a real auth account.
insert into public.student_rosters (
  trainer_id, student_user_id, student_name, student_email, student_phone,
  remaining_sessions, total_sessions, memo
)
select
  t.id,
  gen_random_uuid(),
  dummy.name,
  dummy.email,
  dummy.phone,
  0,
  dummy.total,
  dummy.memo
from public.trainers t
join lateral (
  values
    ('김종료', 'demo.ended1.' || t.id::text || '@example.com', '010-0000-1111', 20, '재등록 안내 보냈음'),
    ('박만료', 'demo.ended2.' || t.id::text || '@example.com', '010-0000-2222', 10, '연장 의사 없음')
) as dummy(name, email, phone, total, memo) on true
on conflict (trainer_id, student_email) do nothing;
