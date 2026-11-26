-- migration: ai usage log and admin user management
-- purpose: (1) log every AI call (tokens in/out, tool, model, time) so admins
--          can see usage and an estimated cost on /admin/forbruk. no student
--          text is stored, only numbers and labels.
--          (2) let admins list users and change their role on /admin/brukere
--          without a service role key in the app.
--          (3) stop users from changing their own role. the policies on
--          profiles let a signed-in user update their own row, role
--          included, so a student could make themselves admin.
-- affected: new table public.ai_usage, new functions public.log_ai_usage,
--           public.ai_usage_daily, public.admin_list_users,
--           public.admin_set_user_role, public.protect_profile_role and a
--           trigger on public.profiles
-- special: additive apart from the trigger, which only blocks role changes
--          made directly by users (not by admins or the database functions).
--          until this migration is applied the app logs nothing and the
--          admin pages show a notice.

-- ---------------------------------------------------------------------------
-- ai_usage: one row per call to a language, image, speech or voice model
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tool text not null,
  provider text not null,
  model text not null,
  kind text not null default 'tekst',
  input_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  output_tokens integer not null default 0,
  units integer not null default 0,
  ok boolean not null default true,
  constraint ai_usage_kind_check check (kind in ('tekst', 'bilde', 'lyd', 'tale')),
  constraint ai_usage_numbers_check check (
    input_tokens >= 0 and cached_tokens >= 0 and output_tokens >= 0 and units >= 0
  )
);

comment on table public.ai_usage is
  'One row per AI call (tokens, tool, model). No user text. Shown on /admin/forbruk.';
comment on column public.ai_usage.units is
  'Pictures (bilde), characters read aloud (lyd) or seconds of speech transcribed (tale).';

create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);

-- rls: only admins can read. rows are written only through log_ai_usage.
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon;
grant select on public.ai_usage to authenticated;

drop policy if exists "Admins can read ai usage" on public.ai_usage;
create policy "Admins can read ai usage"
on public.ai_usage
for select
to authenticated
using ( (select public.is_admin()) );

-- ---------------------------------------------------------------------------
-- log_ai_usage: called by the server after each AI call. students are not
-- signed in, so anon may call it. the values are checked and capped so the
-- function cannot be used to store text.
-- ---------------------------------------------------------------------------
create or replace function public.log_ai_usage(
  p_tool text,
  p_provider text,
  p_model text,
  p_kind text default 'tekst',
  p_input_tokens integer default 0,
  p_cached_tokens integer default 0,
  p_output_tokens integer default 0,
  p_units integer default 0,
  p_ok boolean default true
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_tool !~ '^[a-z0-9-]{1,48}$' or p_provider !~ '^[a-z0-9-]{1,24}$' or length(coalesce(p_model, '')) not between 1 and 80 then
    raise exception 'invalid usage entry';
  end if;
  if p_kind not in ('tekst', 'bilde', 'lyd', 'tale') then
    raise exception 'invalid usage kind';
  end if;

  insert into public.ai_usage (tool, provider, model, kind, input_tokens, cached_tokens, output_tokens, units, ok)
  values (
    p_tool,
    p_provider,
    p_model,
    p_kind,
    least(greatest(coalesce(p_input_tokens, 0), 0), 2000000),
    least(greatest(coalesce(p_cached_tokens, 0), 0), 2000000),
    least(greatest(coalesce(p_output_tokens, 0), 0), 2000000),
    least(greatest(coalesce(p_units, 0), 0), 2000000),
    coalesce(p_ok, true)
  );
end;
$$;

revoke all on function public.log_ai_usage(text, text, text, text, integer, integer, integer, integer, boolean) from public;
grant execute on function public.log_ai_usage(text, text, text, text, integer, integer, integer, integer, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- ai_usage_daily: totals per day (Oslo time), tool and model for the charts.
-- admins only.
-- ---------------------------------------------------------------------------
create or replace function public.ai_usage_daily(p_days integer default 30)
returns table (
  day date,
  tool text,
  provider text,
  model text,
  kind text,
  calls bigint,
  input_tokens bigint,
  cached_tokens bigint,
  output_tokens bigint,
  units bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    (u.created_at at time zone 'Europe/Oslo')::date as day,
    u.tool,
    u.provider,
    u.model,
    u.kind,
    count(*)::bigint,
    sum(u.input_tokens)::bigint,
    sum(u.cached_tokens)::bigint,
    sum(u.output_tokens)::bigint,
    sum(u.units)::bigint
  from public.ai_usage u
  where u.created_at >= (date_trunc('day', now() at time zone 'Europe/Oslo') - make_interval(days => least(greatest(p_days, 1), 366) - 1)) at time zone 'Europe/Oslo'
  group by 1, 2, 3, 4, 5
  order by 1;
end;
$$;

revoke all on function public.ai_usage_daily(integer) from public, anon;
grant execute on function public.ai_usage_daily(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_users: every user with e-mail, name, role and last sign-in.
-- admins only. the role is profiles.role; app_metadata.role wins when set,
-- the same way the app reads it.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  first_name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  confirmed boolean,
  group_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.first_name,
    coalesce(nullif(u.raw_app_meta_data ->> 'role', ''), p.role::text, 'student'),
    u.created_at,
    u.last_sign_in_at,
    (u.email_confirmed_at is not null),
    (select count(*) from public.group_members gm where gm.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------------------------------------------------------------------------
-- admin_set_user_role: sets profiles.role and removes app_metadata.role so the
-- new role is the one the app reads. admins only, and an admin cannot change
-- their own role (so the last admin cannot lock themselves out).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if p_role not in ('student', 'teacher', 'admin') then
    raise exception 'invalid role';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot change own role';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'user not found';
  end if;

  insert into public.profiles (id, role)
  values (p_user_id, p_role::public.user_role)
  on conflict (id) do update set role = excluded.role, updated_at = now();

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
  where id = p_user_id
    and raw_app_meta_data ? 'role';
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- protect_profile_role: only admins (and security definer functions such as
-- handle_new_user and admin_set_user_role) can set profiles.role. a user who
-- updates their own profile directly keeps their role; a profile a user
-- inserts directly always gets the role student.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- inside a security definer function current_user is its owner, so only
  -- direct calls through the api (anon / authenticated) are checked.
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'student'::public.user_role;
  elsif new.role is distinct from old.role then
    raise exception 'only an admin can change a role';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before insert or update on public.profiles
for each row execute function public.protect_profile_role();
