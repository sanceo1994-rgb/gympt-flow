alter table public.trainers
  add column if not exists gallery_urls text[] not null default '{}';
