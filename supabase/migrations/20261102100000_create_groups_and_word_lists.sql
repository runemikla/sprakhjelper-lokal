-- migration: create groups and word lists
-- purpose: teachers make groups that students join with an access code, and
--          the «Lær ord» word lists move from the browser into the database.
--          a word list is shared with one or more groups; students see the
--          lists shared with the groups they belong to.
-- affected: new tables public.groups, public.group_members, public.word_lists,
--           public.word_list_groups, public.word_list_items; new functions;
--           new storage bucket word-lists (public read).
-- special: purely additive. no existing tables or rows are changed, so the
--          code on main keeps working while this is tested on dev.
--          admins have the same rights as teachers and can see and manage
--          every group and word list.

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  -- six characters without ambiguous glyphs (0/o, 1/i), set by a trigger.
  access_code text not null unique
    check (access_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.groups is
  'Teacher-made groups. Students join with access_code (via join_group). Word lists are shared with groups.';

create index if not exists groups_created_by_idx on public.groups (created_by);

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
before update on public.groups
for each row
execute function public.set_updated_at();

create or replace function public.generate_group_access_code()
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
    for i in 1..6 loop
      generated_code := generated_code
        || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    if not exists (select 1 from public.groups where access_code = generated_code) then
      return generated_code;
    end if;

    attempt := attempt + 1;
    if attempt > 50 then
      raise exception 'could not generate a unique group access code';
    end if;
  end loop;
end;
$$;

revoke all on function public.generate_group_access_code() from public;

create or replace function public.set_group_access_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.access_code is null then
    new.access_code := public.generate_group_access_code();
  end if;
  return new;
end;
$$;

revoke all on function public.set_group_access_code() from public;

drop trigger if exists groups_set_access_code on public.groups;
create trigger groups_set_access_code
before insert on public.groups
for each row
execute function public.set_group_access_code();

-- ---------------------------------------------------------------------------
-- group_members: who has joined which group
-- ---------------------------------------------------------------------------
create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

comment on table public.group_members is
  'Members of a group. Rows are added by join_group(code); members can leave, owners and admins can remove members.';

create index if not exists group_members_user_idx on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- word lists
-- ---------------------------------------------------------------------------
create table if not exists public.word_lists (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  -- the students' first languages (morsmål)
  languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.word_lists is
  'Teacher-made word lists for «Lær ord». Shared with groups through word_list_groups.';

create index if not exists word_lists_created_by_idx on public.word_lists (created_by);

drop trigger if exists word_lists_set_updated_at on public.word_lists;
create trigger word_lists_set_updated_at
before update on public.word_lists
for each row
execute function public.set_updated_at();

create table if not exists public.word_list_groups (
  word_list_id uuid not null references public.word_lists (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  primary key (word_list_id, group_id)
);

create index if not exists word_list_groups_group_idx on public.word_list_groups (group_id);

-- id is made in the browser so generated pictures and recordings can be
-- stored under it before and after the list is saved again.
create table if not exists public.word_list_items (
  id uuid primary key,
  list_id uuid not null references public.word_lists (id) on delete cascade,
  position int not null,
  word text not null check (char_length(word) between 1 and 80),
  image_description text not null default '' check (char_length(image_description) <= 300),
  -- text from the language model: inflection, english, translations,
  -- example sentence and picture motif (see lib/ordlister/types.ts)
  content jsonb,
  -- which version of the picture/recordings is stored in the word-lists bucket
  media jsonb not null default '{}'::jsonb
);

create index if not exists word_list_items_list_idx on public.word_list_items (list_id, position);

-- ---------------------------------------------------------------------------
-- helper functions (security definer so policies do not recurse)
-- ---------------------------------------------------------------------------
create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups
    where public.groups.id = p_group_id
      and public.groups.created_by = (select auth.uid())
  );
$$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where public.group_members.group_id = p_group_id
      and public.group_members.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_manage_word_list(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.word_lists
    where public.word_lists.id = p_list_id
      and public.word_lists.created_by = (select auth.uid())
  );
$$;

create or replace function public.can_read_word_list(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_word_list(p_list_id) or exists (
    select 1
    from public.word_list_groups
    join public.group_members
      on public.group_members.group_id = public.word_list_groups.group_id
    where public.word_list_groups.word_list_id = p_list_id
      and public.group_members.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_group_owner(uuid) from public;
revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.can_manage_word_list(uuid) from public;
revoke all on function public.can_read_word_list(uuid) from public;
grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.can_manage_word_list(uuid) to authenticated;
grant execute on function public.can_read_word_list(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- rls: groups
-- ---------------------------------------------------------------------------
alter table public.groups enable row level security;

drop policy if exists "Owners, members and admins can read groups" on public.groups;
create policy "Owners, members and admins can read groups"
on public.groups for select to authenticated
using (
  created_by = (select auth.uid())
  or (select public.is_admin())
  or public.is_group_member(id)
);

drop policy if exists "Teachers can create groups" on public.groups;
create policy "Teachers can create groups"
on public.groups for insert to authenticated
with check ( (select public.is_teacher()) and created_by = (select auth.uid()) );

drop policy if exists "Owners and admins can update groups" on public.groups;
create policy "Owners and admins can update groups"
on public.groups for update to authenticated
using ( created_by = (select auth.uid()) or (select public.is_admin()) )
with check ( created_by = (select auth.uid()) or (select public.is_admin()) );

drop policy if exists "Owners and admins can delete groups" on public.groups;
create policy "Owners and admins can delete groups"
on public.groups for delete to authenticated
using ( created_by = (select auth.uid()) or (select public.is_admin()) );

-- ---------------------------------------------------------------------------
-- rls: group_members (rows are added by join_group only)
-- ---------------------------------------------------------------------------
alter table public.group_members enable row level security;

drop policy if exists "Members, owners and admins can read memberships" on public.group_members;
create policy "Members, owners and admins can read memberships"
on public.group_members for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_group_owner(group_id)
  or (select public.is_admin())
);

drop policy if exists "Members leave, owners and admins remove" on public.group_members;
create policy "Members leave, owners and admins remove"
on public.group_members for delete to authenticated
using (
  user_id = (select auth.uid())
  or public.is_group_owner(group_id)
  or (select public.is_admin())
);

-- ---------------------------------------------------------------------------
-- rls: word lists
-- ---------------------------------------------------------------------------
alter table public.word_lists enable row level security;

drop policy if exists "Owners, admins and group members can read word lists" on public.word_lists;
create policy "Owners, admins and group members can read word lists"
on public.word_lists for select to authenticated
-- created_by is checked directly too: insert ... returning must see the new
-- row, which the stable helper function cannot see yet.
using ( created_by = (select auth.uid()) or public.can_read_word_list(id) );

drop policy if exists "Teachers can create word lists" on public.word_lists;
create policy "Teachers can create word lists"
on public.word_lists for insert to authenticated
with check ( (select public.is_teacher()) and created_by = (select auth.uid()) );

drop policy if exists "Owners and admins can update word lists" on public.word_lists;
create policy "Owners and admins can update word lists"
on public.word_lists for update to authenticated
using ( public.can_manage_word_list(id) )
with check ( public.can_manage_word_list(id) );

drop policy if exists "Owners and admins can delete word lists" on public.word_lists;
create policy "Owners and admins can delete word lists"
on public.word_lists for delete to authenticated
using ( public.can_manage_word_list(id) );

alter table public.word_list_items enable row level security;

drop policy if exists "Readers of the list can read its words" on public.word_list_items;
create policy "Readers of the list can read its words"
on public.word_list_items for select to authenticated
using ( public.can_read_word_list(list_id) );

drop policy if exists "Managers of the list can add words" on public.word_list_items;
create policy "Managers of the list can add words"
on public.word_list_items for insert to authenticated
with check ( public.can_manage_word_list(list_id) );

drop policy if exists "Managers of the list can change words" on public.word_list_items;
create policy "Managers of the list can change words"
on public.word_list_items for update to authenticated
using ( public.can_manage_word_list(list_id) )
with check ( public.can_manage_word_list(list_id) );

drop policy if exists "Managers of the list can delete words" on public.word_list_items;
create policy "Managers of the list can delete words"
on public.word_list_items for delete to authenticated
using ( public.can_manage_word_list(list_id) );

alter table public.word_list_groups enable row level security;

drop policy if exists "Readers of the list can see its groups" on public.word_list_groups;
create policy "Readers of the list can see its groups"
on public.word_list_groups for select to authenticated
using ( public.can_read_word_list(word_list_id) );

-- a list can only be shared with the teacher's own groups (admins: any group)
drop policy if exists "Managers share lists with their groups" on public.word_list_groups;
create policy "Managers share lists with their groups"
on public.word_list_groups for insert to authenticated
with check (
  public.can_manage_word_list(word_list_id)
  and (public.is_group_owner(group_id) or (select public.is_admin()))
);

drop policy if exists "Managers of the list can unshare it" on public.word_list_groups;
create policy "Managers of the list can unshare it"
on public.word_list_groups for delete to authenticated
using ( public.can_manage_word_list(word_list_id) );

-- ---------------------------------------------------------------------------
-- join_group: a logged-in user joins a group with its access code
-- ---------------------------------------------------------------------------
create or replace function public.join_group(p_code text)
returns table (id uuid, name text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_group public.groups%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'not logged in' using errcode = '28000';
  end if;

  select * into v_group
  from public.groups
  where public.groups.access_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

  if not found then
    return;
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group.id, (select auth.uid()))
  on conflict do nothing;

  return query select v_group.id, v_group.name;
end;
$$;

revoke all on function public.join_group(text) from public;
grant execute on function public.join_group(text) to authenticated;

-- ---------------------------------------------------------------------------
-- list_my_groups: the groups page. owners and admins see the access code.
-- ---------------------------------------------------------------------------
create or replace function public.list_my_groups()
returns table (
  id uuid,
  name text,
  access_code text,
  created_by uuid,
  owner_email text,
  member_count bigint,
  is_owner boolean,
  is_member boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.name,
    case when g.created_by = (select auth.uid()) or public.is_admin() then g.access_code end,
    g.created_by,
    case when g.created_by = (select auth.uid()) or public.is_admin() then u.email::text end,
    (select count(*) from public.group_members m where m.group_id = g.id),
    g.created_by = (select auth.uid()),
    exists (
      select 1 from public.group_members m
      where m.group_id = g.id and m.user_id = (select auth.uid())
    ),
    g.created_at
  from public.groups g
  left join auth.users u on u.id = g.created_by
  where (select auth.uid()) is not null
    and (
      g.created_by = (select auth.uid())
      or public.is_admin()
      or exists (
        select 1 from public.group_members m
        where m.group_id = g.id and m.user_id = (select auth.uid())
      )
    )
  order by g.created_at desc;
$$;

revoke all on function public.list_my_groups() from public;
grant execute on function public.list_my_groups() to authenticated;

-- ---------------------------------------------------------------------------
-- get_group_members: e-mail addresses of the members, for owners and admins
-- ---------------------------------------------------------------------------
create or replace function public.get_group_members(p_group_id uuid)
returns table (user_id uuid, email text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_group_owner(p_group_id) or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select m.user_id, u.email::text, m.joined_at
  from public.group_members m
  left join auth.users u on u.id = m.user_id
  where m.group_id = p_group_id
  order by u.email;
end;
$$;

revoke all on function public.get_group_members(uuid) from public;
grant execute on function public.get_group_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- save_word_list: saves a list, its words and its groups in one transaction.
-- security invoker, so the rls policies above decide what may be saved.
-- p_items: [{ id, word, image_description, content, media }] in order.
-- ---------------------------------------------------------------------------
create or replace function public.save_word_list(
  p_id uuid,
  p_title text,
  p_languages text[],
  p_items jsonb,
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
  v_ids uuid[];
begin
  if v_id is null then
    insert into public.word_lists (created_by, title, languages)
    values ((select auth.uid()), p_title, coalesce(p_languages, '{}'))
    returning public.word_lists.id into v_id;
  else
    update public.word_lists
    set title = p_title, languages = coalesce(p_languages, '{}')
    where public.word_lists.id = v_id;
    if not found then
      raise exception 'word list not found' using errcode = 'P0002';
    end if;
  end if;

  select coalesce(array_agg((item ->> 'id')::uuid), '{}')
  into v_ids
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  delete from public.word_list_items
  where public.word_list_items.list_id = v_id
    and not (public.word_list_items.id = any (v_ids));

  insert into public.word_list_items (id, list_id, position, word, image_description, content, media)
  select
    (t.item ->> 'id')::uuid,
    v_id,
    t.pos::int,
    t.item ->> 'word',
    coalesce(t.item ->> 'image_description', ''),
    case when jsonb_typeof(t.item -> 'content') = 'object' then t.item -> 'content' end,
    case when jsonb_typeof(t.item -> 'media') = 'object' then t.item -> 'media' else '{}'::jsonb end
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(item, pos)
  on conflict (id) do update
  set position = excluded.position,
      word = excluded.word,
      image_description = excluded.image_description,
      content = excluded.content,
      media = excluded.media
  where public.word_list_items.list_id = v_id;

  delete from public.word_list_groups
  where public.word_list_groups.word_list_id = v_id
    and not (public.word_list_groups.group_id = any (coalesce(p_group_ids, '{}')));

  insert into public.word_list_groups (word_list_id, group_id)
  select v_id, g
  from unnest(coalesce(p_group_ids, '{}')) as g
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function public.save_word_list(uuid, text, text[], jsonb, uuid[]) from public;
grant execute on function public.save_word_list(uuid, text, text[], jsonb, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- storage: pictures and recordings, <list_id>/<item_id>-<kind>.<ext>
-- ---------------------------------------------------------------------------
-- the first folder of the object name is the list id. returns false for
-- names that are not <uuid>/..., so a bad name never raises a cast error.
create or replace function public.can_manage_word_list_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.can_manage_word_list(split_part(p_name, '/', 1)::uuid)
    else false
  end;
$$;

revoke all on function public.can_manage_word_list_file(text) from public;
grant execute on function public.can_manage_word_list_file(text) to authenticated;

-- the bucket is public so «Lær ord» can play the files directly; the files
-- are word pictures and words read aloud, nothing personal.
insert into storage.buckets (id, name, public)
values ('word-lists', 'word-lists', true)
on conflict (id) do update set public = true;

drop policy if exists "Word list managers can read files" on storage.objects;
create policy "Word list managers can read files"
on storage.objects for select to authenticated
using (
  bucket_id = 'word-lists'
  and public.can_manage_word_list_file(name)
);

drop policy if exists "Word list managers can upload files" on storage.objects;
create policy "Word list managers can upload files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'word-lists'
  and public.can_manage_word_list_file(name)
);

drop policy if exists "Word list managers can replace files" on storage.objects;
create policy "Word list managers can replace files"
on storage.objects for update to authenticated
using (
  bucket_id = 'word-lists'
  and public.can_manage_word_list_file(name)
)
with check (
  bucket_id = 'word-lists'
  and public.can_manage_word_list_file(name)
);

drop policy if exists "Word list managers can delete files" on storage.objects;
create policy "Word list managers can delete files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'word-lists'
  and public.can_manage_word_list_file(name)
);
