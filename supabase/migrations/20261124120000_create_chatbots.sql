-- migration: create chatbots («Snakkebot»)
-- purpose: teachers make voice chatbots (name, system instruction, voice,
--          level) that students talk to. a chatbot is shared with groups
--          (like word lists) and can also be opened with a 4-character code
--          without logging in (like listening exercises).
-- affected: new tables public.chatbots and public.chatbot_groups; new
--           functions get_chatbot_by_code, save_chatbot and helpers.
-- special: purely additive. no existing tables or rows are changed.
--          conversations and recordings are NOT stored anywhere; only the
--          teacher's chatbot settings are saved.

-- ---------------------------------------------------------------------------
-- chatbots
-- ---------------------------------------------------------------------------
create table if not exists public.chatbots (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- short text the student sees before the conversation starts
  description text not null default '' check (char_length(description) <= 300),
  -- the teacher's system instruction (role, topic, what to practise)
  instructions text not null check (char_length(instructions) between 1 and 4000),
  -- optional first message the chatbot says; empty = the model greets
  greeting text not null default '' check (char_length(greeting) <= 300),
  -- gemini voice, see lib/tts/gemini-voices.ts
  voice text not null default 'Erinome' check (char_length(voice) between 1 and 40),
  -- optional cefr level that tunes the language of the answers
  level text check (level in ('A1', 'A2', 'B1', 'B2')),
  -- four characters without ambiguous glyphs (0/o, 1/i), set by a trigger
  access_code text not null unique
    check (access_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chatbots is
  'Teacher-made voice chatbots («Snakkebot»). Shared with groups through chatbot_groups, or opened with access_code via get_chatbot_by_code. Conversations are not stored.';

create index if not exists chatbots_created_by_idx on public.chatbots (created_by);

drop trigger if exists chatbots_set_updated_at on public.chatbots;
create trigger chatbots_set_updated_at
before update on public.chatbots
for each row
execute function public.set_updated_at();

create or replace function public.generate_chatbot_access_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text;
  attempt int := 0;
begin
  loop
    generated_code := '';
    for i in 1..4 loop
      generated_code := generated_code
        || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    if not exists (select 1 from public.chatbots where access_code = generated_code) then
      return generated_code;
    end if;

    attempt := attempt + 1;
    if attempt > 50 then
      raise exception 'could not generate a unique chatbot access code';
    end if;
  end loop;
end;
$$;

revoke all on function public.generate_chatbot_access_code() from public;

create or replace function public.set_chatbot_access_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.access_code := public.generate_chatbot_access_code();
  elsif new.access_code is distinct from old.access_code then
    -- the code cannot be changed by an update
    new.access_code := old.access_code;
  end if;
  return new;
end;
$$;

revoke all on function public.set_chatbot_access_code() from public;

drop trigger if exists chatbots_set_access_code on public.chatbots;
create trigger chatbots_set_access_code
before insert or update on public.chatbots
for each row
execute function public.set_chatbot_access_code();

create table if not exists public.chatbot_groups (
  chatbot_id uuid not null references public.chatbots (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  primary key (chatbot_id, group_id)
);

create index if not exists chatbot_groups_group_idx on public.chatbot_groups (group_id);

-- ---------------------------------------------------------------------------
-- helper functions (security definer so policies do not recurse)
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_chatbot(p_chatbot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.chatbots
    where public.chatbots.id = p_chatbot_id
      and public.chatbots.created_by = (select auth.uid())
  );
$$;

create or replace function public.can_read_chatbot(p_chatbot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_chatbot(p_chatbot_id) or exists (
    select 1
    from public.chatbot_groups
    join public.group_members
      on public.group_members.group_id = public.chatbot_groups.group_id
    where public.chatbot_groups.chatbot_id = p_chatbot_id
      and public.group_members.user_id = (select auth.uid())
  );
$$;

revoke all on function public.can_manage_chatbot(uuid) from public;
revoke all on function public.can_read_chatbot(uuid) from public;
grant execute on function public.can_manage_chatbot(uuid) to authenticated;
grant execute on function public.can_read_chatbot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- rls: chatbots
-- ---------------------------------------------------------------------------
alter table public.chatbots enable row level security;

drop policy if exists "Owners, admins and group members can read chatbots" on public.chatbots;
create policy "Owners, admins and group members can read chatbots"
on public.chatbots for select to authenticated
-- created_by is checked directly too: insert ... returning must see the new
-- row, which the stable helper function cannot see yet.
using ( created_by = (select auth.uid()) or public.can_read_chatbot(id) );

drop policy if exists "Teachers can create chatbots" on public.chatbots;
create policy "Teachers can create chatbots"
on public.chatbots for insert to authenticated
with check ( (select public.is_teacher()) and created_by = (select auth.uid()) );

drop policy if exists "Owners and admins can update chatbots" on public.chatbots;
create policy "Owners and admins can update chatbots"
on public.chatbots for update to authenticated
using ( public.can_manage_chatbot(id) )
with check ( public.can_manage_chatbot(id) );

drop policy if exists "Owners and admins can delete chatbots" on public.chatbots;
create policy "Owners and admins can delete chatbots"
on public.chatbots for delete to authenticated
using ( public.can_manage_chatbot(id) );

-- ---------------------------------------------------------------------------
-- rls: chatbot_groups
-- ---------------------------------------------------------------------------
alter table public.chatbot_groups enable row level security;

drop policy if exists "Readers of the chatbot can see its groups" on public.chatbot_groups;
create policy "Readers of the chatbot can see its groups"
on public.chatbot_groups for select to authenticated
using ( public.can_read_chatbot(chatbot_id) );

-- a chatbot can only be shared with the teacher's own groups (admins: any group)
drop policy if exists "Managers share chatbots with their groups" on public.chatbot_groups;
create policy "Managers share chatbots with their groups"
on public.chatbot_groups for insert to authenticated
with check (
  public.can_manage_chatbot(chatbot_id)
  and (public.is_group_owner(group_id) or (select public.is_admin()))
);

drop policy if exists "Managers of the chatbot can unshare it" on public.chatbot_groups;
create policy "Managers of the chatbot can unshare it"
on public.chatbot_groups for delete to authenticated
using ( public.can_manage_chatbot(chatbot_id) );

-- ---------------------------------------------------------------------------
-- get_chatbot_by_code: students open a chatbot with its code, without
-- logging in. the server needs the instructions to talk to the model.
-- ---------------------------------------------------------------------------
create or replace function public.get_chatbot_by_code(p_access_code text)
returns table (
  id uuid,
  name text,
  description text,
  instructions text,
  greeting text,
  voice text,
  level text,
  access_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.description, c.instructions, c.greeting, c.voice, c.level, c.access_code
  from public.chatbots c
  where c.access_code = upper(regexp_replace(coalesce(p_access_code, ''), '[^A-Za-z0-9]', '', 'g'))
  limit 1;
$$;

comment on function public.get_chatbot_by_code(text) is
  'Returns one chatbot by its exact 4-character access code, for students who are not logged in.';

revoke all on function public.get_chatbot_by_code(text) from public;
grant execute on function public.get_chatbot_by_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- save_chatbot: saves a chatbot and its groups in one transaction.
-- security invoker, so the rls policies above decide what may be saved.
-- ---------------------------------------------------------------------------
create or replace function public.save_chatbot(
  p_id uuid,
  p_name text,
  p_description text,
  p_instructions text,
  p_greeting text,
  p_voice text,
  p_level text,
  p_group_ids uuid[]
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if v_id is null then
    insert into public.chatbots (created_by, name, description, instructions, greeting, voice, level, access_code)
    values (
      (select auth.uid()),
      p_name,
      coalesce(p_description, ''),
      p_instructions,
      coalesce(p_greeting, ''),
      coalesce(nullif(p_voice, ''), 'Erinome'),
      nullif(p_level, ''),
      'AAAA' -- replaced by the access code trigger
    )
    returning public.chatbots.id into v_id;
  else
    update public.chatbots
    set name = p_name,
        description = coalesce(p_description, ''),
        instructions = p_instructions,
        greeting = coalesce(p_greeting, ''),
        voice = coalesce(nullif(p_voice, ''), 'Erinome'),
        level = nullif(p_level, '')
    where public.chatbots.id = v_id;
    if not found then
      raise exception 'chatbot not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.chatbot_groups
  where public.chatbot_groups.chatbot_id = v_id
    and not (public.chatbot_groups.group_id = any (coalesce(p_group_ids, '{}')));

  insert into public.chatbot_groups (chatbot_id, group_id)
  select v_id, g
  from unnest(coalesce(p_group_ids, '{}')) as g
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function public.save_chatbot(uuid, text, text, text, text, text, text, uuid[]) from public;
grant execute on function public.save_chatbot(uuid, text, text, text, text, text, text, uuid[]) to authenticated;
