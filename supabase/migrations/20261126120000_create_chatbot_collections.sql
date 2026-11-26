-- migration: chatbot collections («Samlinger» in Snakkebot)
-- purpose: an admin puts several chatbots together in a collection, for
--          example «Kundeveiledning» with ten different customers. students
--          see one card, pick a case (or a random one), and talk to that
--          chatbot with its own instruction and voice. a collection is shared
--          with groups and has its own 4-character code, like a chatbot.
-- affected: new tables public.chatbot_collections,
--           public.chatbot_collection_items, public.chatbot_collection_groups;
--           new functions; can_read_chatbot and generate_chatbot_access_code
--           are replaced (same signatures) so that group members of a
--           collection can use its chatbots and codes never collide.
-- special: additive. no rows are changed or deleted.

-- ---------------------------------------------------------------------------
-- codes: chatbots and collections share the /snakkebot/<KODE> address, so a
-- new code must be free in both tables.
-- ---------------------------------------------------------------------------
create table if not exists public.chatbot_collections (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  -- the teacher's text to the students: how to do it, learning goals and
  -- what to practise. shown before the student picks a case, and given to
  -- the chatbots as context.
  goals text not null default '' check (char_length(goals) <= 2000),
  access_code text not null unique
    check (access_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chatbot_collections is
  'Collections of chatbots («Samlinger»): students pick one of the chatbots (cases) in it. Shared with groups through chatbot_collection_groups, or opened with access_code.';

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

    if not exists (select 1 from public.chatbots where access_code = generated_code)
       and not exists (select 1 from public.chatbot_collections where access_code = generated_code) then
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

-- the chatbots trigger function works for collections too (same column)
drop trigger if exists chatbot_collections_set_access_code on public.chatbot_collections;
create trigger chatbot_collections_set_access_code
before insert or update on public.chatbot_collections
for each row
execute function public.set_chatbot_access_code();

drop trigger if exists chatbot_collections_set_updated_at on public.chatbot_collections;
create trigger chatbot_collections_set_updated_at
before update on public.chatbot_collections
for each row
execute function public.set_updated_at();

create table if not exists public.chatbot_collection_items (
  collection_id uuid not null references public.chatbot_collections (id) on delete cascade,
  chatbot_id uuid not null references public.chatbots (id) on delete cascade,
  -- order in the list the student sees
  position int not null default 0,
  primary key (collection_id, chatbot_id)
);

create index if not exists chatbot_collection_items_chatbot_idx on public.chatbot_collection_items (chatbot_id);

create table if not exists public.chatbot_collection_groups (
  collection_id uuid not null references public.chatbot_collections (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  primary key (collection_id, group_id)
);

create index if not exists chatbot_collection_groups_group_idx on public.chatbot_collection_groups (group_id);

-- ---------------------------------------------------------------------------
-- who may read: admins and teachers see all collections (like chatbots);
-- students see the ones shared with their groups.
-- ---------------------------------------------------------------------------
create or replace function public.can_read_chatbot_collection(p_collection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or public.is_teacher() or exists (
    select 1
    from public.chatbot_collection_groups cg
    join public.group_members gm on gm.group_id = cg.group_id
    where cg.collection_id = p_collection_id
      and gm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.can_read_chatbot_collection(uuid) from public;
grant execute on function public.can_read_chatbot_collection(uuid) to authenticated;

-- a chatbot can also be read by members of a group that has a collection
-- with the chatbot in it.
create or replace function public.can_read_chatbot(p_chatbot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_chatbot(p_chatbot_id)
  or exists (
    select 1
    from public.chatbot_groups
    join public.group_members
      on public.group_members.group_id = public.chatbot_groups.group_id
    where public.chatbot_groups.chatbot_id = p_chatbot_id
      and public.group_members.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.chatbot_collection_items ci
    join public.chatbot_collection_groups cg on cg.collection_id = ci.collection_id
    join public.group_members gm on gm.group_id = cg.group_id
    where ci.chatbot_id = p_chatbot_id
      and gm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.can_read_chatbot(uuid) from public;
grant execute on function public.can_read_chatbot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- rls
-- ---------------------------------------------------------------------------
alter table public.chatbot_collections enable row level security;
alter table public.chatbot_collection_items enable row level security;
alter table public.chatbot_collection_groups enable row level security;

drop policy if exists "Readers can see chatbot collections" on public.chatbot_collections;
create policy "Readers can see chatbot collections"
on public.chatbot_collections for select to authenticated
using ( created_by = (select auth.uid()) or public.can_read_chatbot_collection(id) );

drop policy if exists "Admins can create chatbot collections" on public.chatbot_collections;
create policy "Admins can create chatbot collections"
on public.chatbot_collections for insert to authenticated
with check ( (select public.is_admin()) and created_by = (select auth.uid()) );

drop policy if exists "Admins can update chatbot collections" on public.chatbot_collections;
create policy "Admins can update chatbot collections"
on public.chatbot_collections for update to authenticated
using ( (select public.is_admin()) )
with check ( (select public.is_admin()) );

drop policy if exists "Admins can delete chatbot collections" on public.chatbot_collections;
create policy "Admins can delete chatbot collections"
on public.chatbot_collections for delete to authenticated
using ( (select public.is_admin()) );

drop policy if exists "Readers can see collection items" on public.chatbot_collection_items;
create policy "Readers can see collection items"
on public.chatbot_collection_items for select to authenticated
using ( public.can_read_chatbot_collection(collection_id) );

drop policy if exists "Admins can add collection items" on public.chatbot_collection_items;
create policy "Admins can add collection items"
on public.chatbot_collection_items for insert to authenticated
with check ( (select public.is_admin()) );

drop policy if exists "Admins can change collection items" on public.chatbot_collection_items;
create policy "Admins can change collection items"
on public.chatbot_collection_items for update to authenticated
using ( (select public.is_admin()) )
with check ( (select public.is_admin()) );

drop policy if exists "Admins can remove collection items" on public.chatbot_collection_items;
create policy "Admins can remove collection items"
on public.chatbot_collection_items for delete to authenticated
using ( (select public.is_admin()) );

drop policy if exists "Readers can see collection groups" on public.chatbot_collection_groups;
create policy "Readers can see collection groups"
on public.chatbot_collection_groups for select to authenticated
using ( public.can_read_chatbot_collection(collection_id) );

drop policy if exists "Admins can share collections" on public.chatbot_collection_groups;
create policy "Admins can share collections"
on public.chatbot_collection_groups for insert to authenticated
with check ( (select public.is_admin()) );

drop policy if exists "Admins can unshare collections" on public.chatbot_collection_groups;
create policy "Admins can unshare collections"
on public.chatbot_collection_groups for delete to authenticated
using ( (select public.is_admin()) );

-- ---------------------------------------------------------------------------
-- opening a collection with its code (no login): the collection and the
-- names of its chatbots, but not their instructions.
-- ---------------------------------------------------------------------------
create or replace function public.get_chatbot_collection_by_code(p_access_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'goals', c.goals,
    'access_code', c.access_code,
    'bots', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', b.id, 'name', b.name, 'description', b.description, 'level', b.level)
        order by ci.position, b.name
      )
      from public.chatbot_collection_items ci
      join public.chatbots b on b.id = ci.chatbot_id
      where ci.collection_id = c.id
    ), '[]'::jsonb)
  )
  from public.chatbot_collections c
  where c.access_code = upper(regexp_replace(coalesce(p_access_code, ''), '[^A-Za-z0-9]', '', 'g'))
  limit 1;
$$;

revoke all on function public.get_chatbot_collection_by_code(text) from public;
grant execute on function public.get_chatbot_collection_by_code(text) to anon, authenticated;

-- one chatbot in a collection, by the collection's code. the server needs
-- the instruction to talk to the model; the browser never gets it.
create or replace function public.get_chatbot_in_collection_by_code(p_access_code text, p_chatbot_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  instructions text,
  greeting text,
  voice text,
  level text,
  access_code text,
  collection_goals text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.name, b.description, b.instructions, b.greeting, b.voice, b.level, b.access_code, c.goals
  from public.chatbot_collections c
  join public.chatbot_collection_items ci on ci.collection_id = c.id
  join public.chatbots b on b.id = ci.chatbot_id
  where c.access_code = upper(regexp_replace(coalesce(p_access_code, ''), '[^A-Za-z0-9]', '', 'g'))
    and b.id = p_chatbot_id
  limit 1;
$$;

revoke all on function public.get_chatbot_in_collection_by_code(text, uuid) from public;
grant execute on function public.get_chatbot_in_collection_by_code(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- save_chatbot_collection: the collection, its chatbots (in order) and its
-- groups in one transaction. security invoker: the policies above decide.
-- ---------------------------------------------------------------------------
create or replace function public.save_chatbot_collection(
  p_id uuid,
  p_name text,
  p_description text,
  p_goals text,
  p_chatbot_ids uuid[],
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
    insert into public.chatbot_collections (created_by, name, description, goals, access_code)
    values ((select auth.uid()), p_name, coalesce(p_description, ''), coalesce(p_goals, ''), 'AAAA') -- code set by trigger
    returning public.chatbot_collections.id into v_id;
  else
    update public.chatbot_collections
    set name = p_name,
        description = coalesce(p_description, ''),
        goals = coalesce(p_goals, '')
    where public.chatbot_collections.id = v_id;
    if not found then
      raise exception 'collection not found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.chatbot_collection_items where collection_id = v_id;
  insert into public.chatbot_collection_items (collection_id, chatbot_id, position)
  select v_id, b, (ord - 1)::int
  from unnest(coalesce(p_chatbot_ids, '{}')) with ordinality as t(b, ord)
  on conflict do nothing;

  delete from public.chatbot_collection_groups
  where collection_id = v_id
    and not (group_id = any (coalesce(p_group_ids, '{}')));
  insert into public.chatbot_collection_groups (collection_id, group_id)
  select v_id, g from unnest(coalesce(p_group_ids, '{}')) as g
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function public.save_chatbot_collection(uuid, text, text, text, uuid[], uuid[]) from public;
grant execute on function public.save_chatbot_collection(uuid, text, text, text, uuid[], uuid[]) to authenticated;
