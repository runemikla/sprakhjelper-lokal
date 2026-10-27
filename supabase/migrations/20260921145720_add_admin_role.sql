-- migration: add admin role
-- purpose: introduce an admin role that can view the AI tool instructions.
--          admins keep teacher capabilities (creating listening exercises).
-- affected: public.profiles.role, public.handle_new_user(), public.is_teacher()
-- special: adds public.is_admin() using the same pattern as public.is_teacher()
--          (honors auth.users app_metadata.role set in the dashboard as well as
--          the profiles.role column). security definer avoids rls recursion.

-- ---------------------------------------------------------------------------
-- profiles.role: allow the new 'admin' value alongside teacher and student
-- ---------------------------------------------------------------------------
-- drop the old check constraint (created in 20260824090500) and re-create it
-- with the extra 'admin' value. this is a non-destructive alteration; existing
-- rows keep their current role.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('teacher', 'student', 'admin'));

-- ---------------------------------------------------------------------------
-- handle_new_user: honor app_metadata.role = 'admin' for new auth users
-- ---------------------------------------------------------------------------
-- new auth users get a student profile by default. app_metadata.role set in the
-- supabase dashboard promotes them to teacher or admin on first insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (
    new.id,
    case
      when coalesce(new.raw_app_meta_data ->> 'role', '') = 'admin' then 'admin'
      when coalesce(new.raw_app_meta_data ->> 'role', '') = 'teacher' then 'teacher'
      else 'student'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- is_admin: true when the current user is an admin
-- ---------------------------------------------------------------------------
-- used by app-level checks. security definer avoids recursive policy checks on
-- profiles. also honors auth.users app_metadata.role = admin set in the
-- dashboard so a freshly promoted user is recognized before their profile row
-- is updated.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    or exists (
      select 1
      from public.profiles
      where public.profiles.id = (select auth.uid())
        and public.profiles.role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- is_teacher: admins keep teacher capabilities
-- ---------------------------------------------------------------------------
-- re-create is_teacher so that an admin is also treated as a teacher. this keeps
-- listening exercise creation and other teacher-only features available to
-- admins without duplicating rls policies.
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') in ('teacher', 'admin')
    or exists (
      select 1
      from public.profiles
      where public.profiles.id = (select auth.uid())
        and public.profiles.role in ('teacher', 'admin')
    );
$$;

revoke all on function public.is_teacher() from public;
grant execute on function public.is_teacher() to authenticated;

-- ---------------------------------------------------------------------------
-- promote known developer accounts to admin
-- ---------------------------------------------------------------------------
-- promote the project owner accounts to admin if they already exist. this is a
-- data change: it only updates matching rows and is safe to run repeatedly.
update public.profiles
set role = 'admin'
where id in (
  select auth.users.id
  from auth.users
  where auth.users.email in (
    'runemikal@gmail.com',
    'rune.mikal.birkeland@vlfk.no'
  )
);
