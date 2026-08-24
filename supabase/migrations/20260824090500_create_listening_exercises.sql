-- migration: create listening exercises
-- purpose: add teacher/student roles and persist listening exercises that
--          students can open with a 4-character code without logging in.
-- affected: public.profiles, public.listening_exercises, public.listening_questions
-- special: security definer helpers are used to avoid rls recursion and to
--          let anonymous users fetch a single exercise by exact access code.

-- ---------------------------------------------------------------------------
-- helper: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: reuse the existing table if present, otherwise create it
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('teacher', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'App profile for each auth user. role is teacher or student and is not writable by the user.';

alter table public.profiles
  add column if not exists role text;

alter table public.profiles
  alter column role set default 'student';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ( (select auth.uid()) = id );

-- new auth users get a student profile. missing profiles for existing auth
-- users are created as teachers so current staff can save exercises.
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
      when coalesce(new.raw_app_meta_data ->> 'role', '') = 'teacher' then 'teacher'
      else 'student'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, role)
select auth.users.id, 'teacher'
from auth.users
on conflict (id) do nothing;

-- used by rls. security definer avoids recursive policy checks on profiles.
-- also honors auth.users app_metadata.role = teacher set in the dashboard.
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'teacher'
    or exists (
      select 1
      from public.profiles
      where public.profiles.id = (select auth.uid())
        and public.profiles.role = 'teacher'
    );
$$;

revoke all on function public.is_teacher() from public;
grant execute on function public.is_teacher() to authenticated;

-- ---------------------------------------------------------------------------
-- listening exercises saved by teachers and opened by a short share code
-- ---------------------------------------------------------------------------
create table if not exists public.listening_exercises (
  id bigint generated always as identity primary key,
  created_by uuid not null references auth.users (id) on delete cascade,
  access_code text not null,
  original_text text not null,
  audio_base64 text not null,
  audio_mime_type text not null default 'audio/mpeg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_exercises_access_code_format
    check (access_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$')
);

comment on table public.listening_exercises is
  'Saved listening exercises. Teachers create them; students open one by typing the 4-character access_code.';

create unique index if not exists listening_exercises_access_code_key
  on public.listening_exercises (access_code);

create index if not exists listening_exercises_created_by_idx
  on public.listening_exercises (created_by);

drop trigger if exists listening_exercises_set_updated_at on public.listening_exercises;

create trigger listening_exercises_set_updated_at
before update on public.listening_exercises
for each row
execute function public.set_updated_at();

-- 4-character codes without ambiguous glyphs (0/o, 1/i).
create or replace function public.generate_listening_access_code()
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text;
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    generated_code :=
      substr(alphabet, 1 + floor(random() * 32)::int, 1)
      || substr(alphabet, 1 + floor(random() * 32)::int, 1)
      || substr(alphabet, 1 + floor(random() * 32)::int, 1)
      || substr(alphabet, 1 + floor(random() * 32)::int, 1);

    exit when not exists (
      select 1
      from public.listening_exercises
      where public.listening_exercises.access_code = generated_code
    );

    if attempt >= 32 then
      raise exception 'Could not generate a unique listening access code';
    end if;
  end loop;

  return generated_code;
end;
$$;

create or replace function public.set_listening_access_code()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- always generate the code server-side so clients cannot pick a guessable value
  new.access_code := public.generate_listening_access_code();
  return new;
end;
$$;

drop trigger if exists listening_exercises_set_access_code on public.listening_exercises;
create trigger listening_exercises_set_access_code
before insert on public.listening_exercises
for each row
execute function public.set_listening_access_code();

alter table public.listening_exercises enable row level security;

drop policy if exists "Teachers can read their own listening exercises" on public.listening_exercises;
create policy "Teachers can read their own listening exercises"
on public.listening_exercises
for select
to authenticated
using (
  public.is_teacher()
  and created_by = (select auth.uid())
);

drop policy if exists "Teachers can insert listening exercises" on public.listening_exercises;
create policy "Teachers can insert listening exercises"
on public.listening_exercises
for insert
to authenticated
with check (
  public.is_teacher()
  and created_by = (select auth.uid())
);

drop policy if exists "Teachers can update their own listening exercises" on public.listening_exercises;
create policy "Teachers can update their own listening exercises"
on public.listening_exercises
for update
to authenticated
using (
  public.is_teacher()
  and created_by = (select auth.uid())
)
with check (
  public.is_teacher()
  and created_by = (select auth.uid())
);

drop policy if exists "Teachers can delete their own listening exercises" on public.listening_exercises;
create policy "Teachers can delete their own listening exercises"
on public.listening_exercises
for delete
to authenticated
using (
  public.is_teacher()
  and created_by = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- questions belonging to a saved listening exercise
-- ---------------------------------------------------------------------------
create table if not exists public.listening_questions (
  id bigint generated always as identity primary key,
  listening_exercise_id bigint not null references public.listening_exercises (id) on delete cascade,
  position integer not null check (position > 0),
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (listening_exercise_id, position)
);

comment on table public.listening_questions is
  'Comprehension questions and answers for a saved listening exercise.';

create index if not exists listening_questions_exercise_id_idx
  on public.listening_questions (listening_exercise_id);

alter table public.listening_questions enable row level security;

drop policy if exists "Teachers can read questions for their exercises" on public.listening_questions;
create policy "Teachers can read questions for their exercises"
on public.listening_questions
for select
to authenticated
using (
  listening_exercise_id in (
    select public.listening_exercises.id
    from public.listening_exercises
    where public.listening_exercises.created_by = (select auth.uid())
  )
);

drop policy if exists "Teachers can insert questions for their exercises" on public.listening_questions;
create policy "Teachers can insert questions for their exercises"
on public.listening_questions
for insert
to authenticated
with check (
  listening_exercise_id in (
    select public.listening_exercises.id
    from public.listening_exercises
    where public.listening_exercises.created_by = (select auth.uid())
      and public.is_teacher()
  )
);

drop policy if exists "Teachers can update questions for their exercises" on public.listening_questions;
create policy "Teachers can update questions for their exercises"
on public.listening_questions
for update
to authenticated
using (
  listening_exercise_id in (
    select public.listening_exercises.id
    from public.listening_exercises
    where public.listening_exercises.created_by = (select auth.uid())
  )
)
with check (
  listening_exercise_id in (
    select public.listening_exercises.id
    from public.listening_exercises
    where public.listening_exercises.created_by = (select auth.uid())
      and public.is_teacher()
  )
);

drop policy if exists "Teachers can delete questions for their exercises" on public.listening_questions;
create policy "Teachers can delete questions for their exercises"
on public.listening_questions
for delete
to authenticated
using (
  listening_exercise_id in (
    select public.listening_exercises.id
    from public.listening_exercises
    where public.listening_exercises.created_by = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- anonymous lookup by exact 4-character code. does not list other exercises.
-- ---------------------------------------------------------------------------
create or replace function public.get_listening_exercise_by_code(p_access_code text)
returns table (
  id bigint,
  access_code text,
  original_text text,
  audio_base64 text,
  audio_mime_type text,
  questions jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_code text;
begin
  normalized_code := upper(trim(p_access_code));

  if normalized_code is null or char_length(normalized_code) <> 4 then
    return;
  end if;

  return query
  select
    listening_exercises.id,
    listening_exercises.access_code,
    listening_exercises.original_text,
    listening_exercises.audio_base64,
    listening_exercises.audio_mime_type,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'question', listening_questions.question,
            'answer', listening_questions.answer
          )
          order by listening_questions.position
        )
        from public.listening_questions
        where listening_questions.listening_exercise_id = listening_exercises.id
      ),
      '[]'::jsonb
    ) as questions
  from public.listening_exercises
  where listening_exercises.access_code = normalized_code;
end;
$$;

comment on function public.get_listening_exercise_by_code(text) is
  'Returns one listening exercise when the 4-character code matches. Callable without login.';

revoke all on function public.get_listening_exercise_by_code(text) from public;
grant execute on function public.get_listening_exercise_by_code(text) to anon, authenticated;

-- teachers save an exercise and its questions in one transaction
create or replace function public.save_listening_exercise(
  p_original_text text,
  p_audio_base64 text,
  p_audio_mime_type text,
  p_questions jsonb
)
returns table (
  exercise_id bigint,
  exercise_code text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id bigint;
  new_code text;
  item jsonb;
  idx integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Only teachers can save listening exercises'
      using errcode = '42501';
  end if;

  if p_original_text is null or char_length(trim(p_original_text)) = 0 then
    raise exception 'Original text is required';
  end if;

  if p_audio_base64 is null or char_length(p_audio_base64) = 0 then
    raise exception 'Audio is required';
  end if;

  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'At least one question is required';
  end if;

  insert into public.listening_exercises (
    created_by,
    original_text,
    audio_base64,
    audio_mime_type
  )
  values (
    (select auth.uid()),
    trim(p_original_text),
    p_audio_base64,
    coalesce(nullif(p_audio_mime_type, ''), 'audio/mpeg')
  )
  returning public.listening_exercises.id, public.listening_exercises.access_code
  into new_id, new_code;

  for idx in 0 .. jsonb_array_length(p_questions) - 1 loop
    item := p_questions -> idx;
    insert into public.listening_questions (
      listening_exercise_id,
      position,
      question,
      answer
    )
    values (
      new_id,
      idx + 1,
      coalesce(item->>'question', ''),
      coalesce(item->>'answer', '')
    );
  end loop;

  return query select new_id, new_code;
end;
$$;

comment on function public.save_listening_exercise(text, text, text, jsonb) is
  'Lets a teacher save a listening exercise and its questions atomically. Returns the generated access code.';

revoke all on function public.save_listening_exercise(text, text, text, jsonb) from public;
grant execute on function public.save_listening_exercise(text, text, text, jsonb) to authenticated;

grant usage, select on sequence public.listening_exercises_id_seq to authenticated;
grant usage, select on sequence public.listening_questions_id_seq to authenticated;

-- table grants: anon has no table access; authenticated is still constrained by rls.
revoke all on table public.profiles from anon, public;
revoke all on table public.listening_exercises from anon, public;
revoke all on table public.listening_questions from anon, public;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.listening_exercises to authenticated;
grant select, insert, update, delete on table public.listening_questions to authenticated;
