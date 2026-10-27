-- migration: create instruction versions
-- purpose: let admins store several versions of each AI tool system instruction
--          ("systeminstruks") and choose which version the tool uses.
-- affected: new table public.instruction_versions, new functions
--           public.get_active_instruction() and public.activate_instruction_version()
-- special: purely additive. no existing tables or rows are changed. when a tool
--          has no active version in this table it keeps using the built-in
--          default from lib/ai/instructions.ts, so applying this migration does
--          not change any tool's behavior until an admin activates a version.

-- ---------------------------------------------------------------------------
-- instruction_versions: one row per saved version of an instruction
-- ---------------------------------------------------------------------------
-- instruction_key matches the keys in lib/ai/instructions.ts (for example
-- 'skrivehjelp_analyse'). content is a template where {{variabel}} placeholders
-- are filled in per request. at most one version per key is active.
create table if not exists public.instruction_versions (
  id uuid primary key default gen_random_uuid(),
  instruction_key text not null check (char_length(instruction_key) between 1 and 100),
  name text not null check (char_length(name) between 1 and 200),
  content text not null check (char_length(content) between 1 and 100000),
  is_active boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.instruction_versions is
  'Admin-managed versions of the AI tool system instructions. The active version per instruction_key is used by the tool; with none active the built-in default from the code is used.';

create index if not exists instruction_versions_key_idx
  on public.instruction_versions (instruction_key, created_at desc);

-- guarantees that at most one version per instruction is active
create unique index if not exists instruction_versions_one_active_idx
  on public.instruction_versions (instruction_key)
  where is_active;

drop trigger if exists instruction_versions_set_updated_at on public.instruction_versions;
create trigger instruction_versions_set_updated_at
before update on public.instruction_versions
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rls: only admins can read and manage versions directly
-- ---------------------------------------------------------------------------
alter table public.instruction_versions enable row level security;

drop policy if exists "Admins can read instruction versions" on public.instruction_versions;
create policy "Admins can read instruction versions"
on public.instruction_versions
for select
to authenticated
using ( (select public.is_admin()) );

drop policy if exists "Admins can create instruction versions" on public.instruction_versions;
create policy "Admins can create instruction versions"
on public.instruction_versions
for insert
to authenticated
with check ( (select public.is_admin()) );

drop policy if exists "Admins can update instruction versions" on public.instruction_versions;
create policy "Admins can update instruction versions"
on public.instruction_versions
for update
to authenticated
using ( (select public.is_admin()) )
with check ( (select public.is_admin()) );

drop policy if exists "Admins can delete instruction versions" on public.instruction_versions;
create policy "Admins can delete instruction versions"
on public.instruction_versions
for delete
to authenticated
using ( (select public.is_admin()) );

-- ---------------------------------------------------------------------------
-- get_active_instruction: content of the active version for one key
-- ---------------------------------------------------------------------------
-- the ai tools are used by students who are not logged in, so the api routes
-- read the active instruction through this function instead of the table.
-- it only exposes the active content for a single key, never the history.
-- returns null when no version is active (the tool then uses the default).
create or replace function public.get_active_instruction(p_instruction_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.instruction_versions.content
  from public.instruction_versions
  where public.instruction_versions.instruction_key = p_instruction_key
    and public.instruction_versions.is_active
  limit 1;
$$;

revoke all on function public.get_active_instruction(text) from public;
grant execute on function public.get_active_instruction(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- activate_instruction_version: switch the active version atomically
-- ---------------------------------------------------------------------------
-- deactivates the current version for the key and activates p_version_id in
-- one transaction. pass null as p_version_id to go back to the built-in
-- default from the code. only admins may call it.
create or replace function public.activate_instruction_version(
  p_instruction_key text,
  p_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Bare administratorer kan aktivere instrukser'
      using errcode = '42501';
  end if;

  if p_version_id is not null and not exists (
    select 1
    from public.instruction_versions
    where public.instruction_versions.id = p_version_id
      and public.instruction_versions.instruction_key = p_instruction_key
  ) then
    raise exception 'Fant ikke versjonen'
      using errcode = 'P0002';
  end if;

  update public.instruction_versions
  set is_active = false
  where public.instruction_versions.instruction_key = p_instruction_key
    and public.instruction_versions.is_active;

  if p_version_id is not null then
    update public.instruction_versions
    set is_active = true
    where public.instruction_versions.id = p_version_id;
  end if;
end;
$$;

revoke all on function public.activate_instruction_version(text, uuid) from public, anon;
grant execute on function public.activate_instruction_version(text, uuid) to authenticated;
