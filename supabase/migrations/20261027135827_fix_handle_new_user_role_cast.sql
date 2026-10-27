-- migration: cast new profile roles to the live column type
-- purpose: signup fails with "database error saving new user" because
--          public.profiles.role is the user_role enum, while handle_new_user()
--          inserted a text case expression. postgres rejects that assignment.
-- affected: public.handle_new_user()
-- special: security definer stays in place. the trigger runs before the new
--          user has a session, so the insert must bypass rls on profiles.
--          the branch keeps databases whose role column is still text working.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
  role_type text;
begin
  -- app_metadata.role is set in the supabase dashboard. everyone else is a student.
  assigned_role := case
    when coalesce(new.raw_app_meta_data ->> 'role', '') = 'admin' then 'admin'
    when coalesce(new.raw_app_meta_data ->> 'role', '') = 'teacher' then 'teacher'
    else 'student'
  end;

  select pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
    into role_type
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.profiles'::pg_catalog.regclass
    and attribute.attname = 'role'
    and not attribute.attisdropped;

  -- format_type returns "user_role" without a schema. search_path is empty,
  -- so an enum cast must be schema-qualified or the insert cannot see the type.
  if role_type = 'user_role' then
    role_type := 'public.user_role';
  end if;

  execute format(
    'insert into public.profiles (id, role) values ($1, $2::%s) on conflict (id) do nothing',
    role_type
  )
  using new.id, assigned_role;

  return new;
end;
$$;
