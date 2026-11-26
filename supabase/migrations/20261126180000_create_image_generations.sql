-- migration: create image generations
-- purpose: limit how many pictures a teacher can have made for word lists in
--          «Lær ord» (40 per 24 hours). each picture made by
--          /api/ordlister/bilde is logged here; admins are not limited and
--          are not logged.
-- affected: new table public.image_generations, new functions
--           public.claim_image_generation and public.image_generations_used
-- special: purely additive. until this migration is applied the route lets
--          every picture through (no limit).

-- ---------------------------------------------------------------------------
-- image_generations: one row per picture made for a teacher
-- ---------------------------------------------------------------------------
create table if not exists public.image_generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.image_generations is
  'Pictures made for teachers'' word lists (Lær ord). Used for the daily limit in /api/ordlister/bilde.';

create index if not exists image_generations_user_created_idx
  on public.image_generations (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- rls: teachers can read their own rows; rows are only written through
-- claim_image_generation, so there are no insert/update/delete policies
-- ---------------------------------------------------------------------------
alter table public.image_generations enable row level security;

drop policy if exists "Users can read own image generations" on public.image_generations;
create policy "Users can read own image generations"
on public.image_generations
for select
to authenticated
using ( user_id = (select auth.uid()) );

-- ---------------------------------------------------------------------------
-- image_generations_used: how many pictures the caller has had made in the
-- last 24 hours
-- ---------------------------------------------------------------------------
create or replace function public.image_generations_used()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.image_generations
  where user_id = (select auth.uid())
    and created_at > now() - interval '24 hours';
$$;

-- ---------------------------------------------------------------------------
-- claim_image_generation: logs one picture for the caller if they have made
-- fewer than 40 in the last 24 hours. the limit lives here, not in the app,
-- so a teacher cannot raise it by calling the function from the browser. returns how many they have used
-- after the call, or -1 when the limit is reached (nothing is logged then).
-- a per-user lock stops parallel requests from slipping past the limit.
-- ---------------------------------------------------------------------------
create or replace function public.claim_image_generation()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_used integer;
  v_limit constant integer := 40;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('image_generations:' || v_user::text, 0));

  select count(*)::integer into v_used
  from public.image_generations
  where user_id = v_user
    and created_at > now() - interval '24 hours';

  if v_used >= v_limit then
    return -1;
  end if;

  insert into public.image_generations (user_id) values (v_user);
  return v_used + 1;
end;
$$;

revoke all on function public.image_generations_used() from public, anon;
revoke all on function public.claim_image_generation() from public, anon;
grant execute on function public.image_generations_used() to authenticated;
grant execute on function public.claim_image_generation() to authenticated;
