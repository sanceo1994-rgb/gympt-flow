create or replace function public.link_student_roster_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.student_rosters
  set student_user_id = new.id
  where lower(student_email) = lower(new.email)
    and student_user_id is distinct from new.id;
  return new;
end;
$$;

revoke execute on function public.link_student_roster_on_signup() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_link_roster on auth.users;
create trigger on_auth_user_created_link_roster
after insert or update of email on auth.users
for each row execute function public.link_student_roster_on_signup();

-- backfill existing accounts that already match a roster row by email
update public.student_rosters r
set student_user_id = u.id
from auth.users u
where lower(u.email) = lower(r.student_email)
  and r.student_user_id is distinct from u.id;
