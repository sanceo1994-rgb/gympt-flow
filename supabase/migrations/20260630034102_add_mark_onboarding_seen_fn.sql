-- Appends a tour key (e.g. 'profile', 'booking', 'schedule') to the caller's
-- own trainers.onboarding_seen, idempotently. security definer + the auth.uid()
-- check let an authenticated trainer mark their own onboarding state without
-- a write policy on trainers, while still preventing them from touching
-- anyone else's row.
create or replace function public.mark_onboarding_seen(p_user_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'not_authorized';
  end if;

  update public.trainers
  set onboarding_seen = array_append(onboarding_seen, p_key)
  where user_id = p_user_id
    and not (p_key = any(onboarding_seen));
end;
$$;

revoke all on function public.mark_onboarding_seen(uuid, text) from public, anon;
grant execute on function public.mark_onboarding_seen(uuid, text) to authenticated;
