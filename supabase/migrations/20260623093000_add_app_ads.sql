create table if not exists public.app_ads (
  id uuid primary key default gen_random_uuid(),
  audience text not null default 'all' check (audience in ('all', 'student', 'trainer')),
  placement text not null default 'mobile_menu',
  label text not null default 'AD',
  title text not null,
  description text not null default '',
  cta_label text not null default '자세히 보기',
  cta_href text not null default '/',
  tone text not null default 'light' check (tone in ('light', 'primary', 'dark')),
  action text not null default 'link' check (action in ('link', 'copy_invite')),
  priority integer not null default 100,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_ads enable row level security;

drop policy if exists "app_ads_select_active" on public.app_ads;
create policy "app_ads_select_active" on public.app_ads
for select
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop trigger if exists app_ads_touch on public.app_ads;
create trigger app_ads_touch before update on public.app_ads
for each row execute function public.touch_updated_at();

create index if not exists app_ads_active_placement_idx
on public.app_ads(placement, audience, priority)
where is_active = true;

insert into public.app_ads (
  audience,
  placement,
  label,
  title,
  description,
  cta_label,
  cta_href,
  tone,
  action,
  priority
)
values
  (
    'trainer',
    'mobile_menu',
    'AD',
    '픽짐피티 Pro' || chr(10) || '첫 달 50% 할인',
    '학생 40명과 알림톡 600건을 포함해요.',
    '요금제 보기',
    '/pricing',
    'light',
    'link',
    10
  ),
  (
    'trainer',
    'mobile_menu',
    'EVENT',
    '동료쌤 초대 +' || chr(10) || 'Basic 14일 무료',
    '초대한 쌤이 첫 일정을 만들면 두 분 모두 14일 무료.',
    '트레이너 초대 링크 복사',
    '',
    'primary',
    'copy_invite',
    20
  )
on conflict do nothing;
