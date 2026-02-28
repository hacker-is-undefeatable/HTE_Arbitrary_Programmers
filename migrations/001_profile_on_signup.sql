-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Creates a profile for every new user at signup (fixes lecture_sessions FK for new users).
-- Existing users without a profile still get one via the quick-create API when they create AI notes.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, learning_goal, preferred_explanation_style)
  values (
    new.id,
    'college',
    null,
    null,
    'step-by-step'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
