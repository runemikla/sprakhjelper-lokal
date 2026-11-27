-- migration: voice display names and «new users» badge for admins
-- purpose: 1) let the admin give the text-to-speech voices their own names,
--             which teachers see in the voice pickers (page /admin/stemmer).
--          2) show admins a badge when new users have signed up since they
--             last opened /admin/brukere.
-- affected: public.tts_voices (new column display_name, new update policy),
--           new table public.admin_seen, new functions
--           public.admin_new_users_count() and public.admin_mark_users_seen().
-- special: purely additive. nothing changes for existing rows; the app works
--          the same way before this is applied (no names, no badge).

-- ---------------------------------------------------------------------------
-- 1) tts_voices.display_name: the admin's own name for a voice, or null for
--    the google name. max 40 characters.
-- ---------------------------------------------------------------------------
alter table public.tts_voices
  add column if not exists display_name text
    check (display_name is null or char_length(display_name) between 1 and 40);

comment on column public.tts_voices.display_name is
  'Name shown to teachers in the voice pickers. Null means the Google name (for example «Erinome»).';

-- admins could add and remove voices before; now they can also rename them.
drop policy if exists "Admins can update tts voices" on public.tts_voices;
create policy "Admins can update tts voices"
on public.tts_voices
for update
to authenticated
using ( (select public.is_admin()) )
with check ( (select public.is_admin()) );

-- ---------------------------------------------------------------------------
-- 2) admin_seen: when each admin last opened the users page. only read and
--    written through the two functions below, so rls has no policies.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_seen (
  admin_id uuid primary key references auth.users (id) on delete cascade,
  users_seen_at timestamptz not null default now()
);

comment on table public.admin_seen is
  'When each admin last opened /admin/brukere. Used for the «new users» badge.';

alter table public.admin_seen enable row level security;

-- the number of users created since the calling admin last opened the users
-- page. an admin who has never opened it sees the users from the last 7 days.
create or replace function public.admin_new_users_count()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select s.users_seen_at into v_since
  from public.admin_seen s
  where s.admin_id = (select auth.uid());

  return (
    select count(*)::integer
    from auth.users u
    where u.created_at > coalesce(v_since, now() - interval '7 days')
  );
end;
$$;

revoke all on function public.admin_new_users_count() from public, anon;
grant execute on function public.admin_new_users_count() to authenticated;

-- marks the users as seen for the calling admin, and returns when they were
-- seen before (null the first time), so the page can mark the new rows.
create or replace function public.admin_mark_users_seen()
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_before timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select s.users_seen_at into v_before
  from public.admin_seen s
  where s.admin_id = (select auth.uid());

  insert into public.admin_seen (admin_id, users_seen_at)
  values ((select auth.uid()), now())
  on conflict (admin_id) do update set users_seen_at = excluded.users_seen_at;

  return coalesce(v_before, now() - interval '7 days');
end;
$$;

revoke all on function public.admin_mark_users_seen() from public, anon;
grant execute on function public.admin_mark_users_seen() to authenticated;
