-- migration: promote existing auth profiles to teacher
-- purpose: logged-in users in this app are staff. students open exercises
--          with a 4-character code and do not have auth accounts.
-- affected: public.profiles.role

update public.profiles
set role = 'teacher'
where role is distinct from 'teacher';
