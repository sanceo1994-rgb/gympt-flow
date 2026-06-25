alter table public.trainers
  add column if not exists theme_from text not null default '#FF4E97',
  add column if not exists theme_to text not null default '#FF6FB1';

alter table public.trainers
  drop constraint if exists trainers_theme_from_hex,
  drop constraint if exists trainers_theme_to_hex;

alter table public.trainers
  add constraint trainers_theme_from_hex check (theme_from ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint trainers_theme_to_hex check (theme_to ~ '^#[0-9A-Fa-f]{6}$');

update public.trainers
set theme_from = case id
    when '0b8781ee-55af-489c-9737-a4b081f596f9'::uuid then '#E23A8A'
    when 'ab0645e2-8477-43da-8d6f-7ccc0bba078a'::uuid then '#2563EB'
    when 'cdec3cbd-c840-407a-a3a1-f8cb987d5359'::uuid then '#16A34A'
    when '95d63246-1b34-419e-97e3-2ae8d3e62bc3'::uuid then '#F59E0B'
    when '2d0fdf86-5a16-4b11-b2ca-4da63b8b075c'::uuid then '#7C3AED'
    else theme_from
  end,
  theme_to = case id
    when '0b8781ee-55af-489c-9737-a4b081f596f9'::uuid then '#FF8AC2'
    when 'ab0645e2-8477-43da-8d6f-7ccc0bba078a'::uuid then '#7DD3FC'
    when 'cdec3cbd-c840-407a-a3a1-f8cb987d5359'::uuid then '#86EFAC'
    when '95d63246-1b34-419e-97e3-2ae8d3e62bc3'::uuid then '#FDE68A'
    when '2d0fdf86-5a16-4b11-b2ca-4da63b8b075c'::uuid then '#C4B5FD'
    else theme_to
  end;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data->>'role';
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    email = excluded.email;

  if requested_role in ('trainer', 'student') then
    insert into public.user_roles (user_id, role)
    values (new.id, requested_role::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;

  if requested_role = 'trainer' then
    insert into public.trainers (
      user_id, name, gym, intro, avatar_url, theme_from, theme_to
    ) values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      nullif(new.raw_user_meta_data->>'gym', ''),
      nullif(new.raw_user_meta_data->>'intro', ''),
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      coalesce(nullif(new.raw_user_meta_data->>'theme_from', ''), '#FF4E97'),
      coalesce(nullif(new.raw_user_meta_data->>'theme_to', ''), '#FF6FB1')
    )
    on conflict (user_id) do update set
      name = excluded.name,
      gym = excluded.gym,
      intro = excluded.intro,
      avatar_url = excluded.avatar_url,
      theme_from = excluded.theme_from,
      theme_to = excluded.theme_to;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

select pg_notify('pgrst', 'reload schema');
