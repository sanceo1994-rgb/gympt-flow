alter table public.gyms
  add column if not exists popularity_rank integer;

create unique index if not exists gyms_popularity_rank_unique
  on public.gyms(popularity_rank)
  where popularity_rank is not null;

update public.gyms set popularity_rank = null where popularity_rank between 1 and 5;

with ranked(rank, gym_name) as (
  values
    (1, '에이블짐 당산역점'),
    (2, '센터원웰니스'),
    (3, '어반필드 영등포KT점'),
    (4, '장교휘트니스센터'),
    (5, '베럴짐 헬스앤피티 여의도점')
),
targets as (
  select distinct on (ranked.rank) gyms.id, ranked.rank
  from ranked
  join public.gyms on public.gyms.name = ranked.gym_name
  order by ranked.rank, public.gyms.address
)
update public.gyms
set popularity_rank = targets.rank
from targets
where public.gyms.id = targets.id;

select pg_notify('pgrst', 'reload schema');
