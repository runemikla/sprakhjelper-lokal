-- migration: allow up to 3 tasks per listening exercise
-- purpose: each listening exercise can contain 1-3 tasks, and each task has
--          its own original text, audio file, and questions. existing
--          exercises are moved into task position 1.
-- affected: public.listening_tasks, public.listening_questions,
--           public.listening_exercises, save/get/update functions

-- ---------------------------------------------------------------------------
-- tasks: one text + audio bundle belonging to a listening exercise
-- ---------------------------------------------------------------------------
create table if not exists public.listening_tasks (
  id bigint generated always as identity primary key,
  listening_exercise_id bigint not null references public.listening_exercises (id) on delete cascade,
  position integer not null check (position between 1 and 3),
  original_text text not null,
  audio_base64 text not null,
  audio_mime_type text not null default 'audio/mpeg',
  created_at timestamptz not null default now(),
  unique (listening_exercise_id, position)
);

comment on table public.listening_tasks is
  'A listening exercise has 1-3 tasks. Each task has its own text, audio, and questions.';

create index if not exists listening_tasks_exercise_id_idx
  on public.listening_tasks (listening_exercise_id);

alter table public.listening_tasks enable row level security;

drop policy if exists "Teachers can read tasks for their exercises" on public.listening_tasks;
create policy "Teachers can read tasks for their exercises"
on public.listening_tasks
for select
to authenticated
using (
  listening_exercise_id in (
    select public.listening_exercises.id
    from public.listening_exercises
    where public.listening_exercises.created_by = (select auth.uid())
  )
);

drop policy if exists "Teachers can insert tasks for their exercises" on public.listening_tasks;
create policy "Teachers can insert tasks for their exercises"
on public.listening_tasks
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

drop policy if exists "Teachers can update tasks for their exercises" on public.listening_tasks;
create policy "Teachers can update tasks for their exercises"
on public.listening_tasks
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

drop policy if exists "Teachers can delete tasks for their exercises" on public.listening_tasks;
create policy "Teachers can delete tasks for their exercises"
on public.listening_tasks
for delete
to authenticated
using (
  listening_exercise_id in (
    select public.listening_exercises.id
    from public.listening_exercises
    where public.listening_exercises.created_by = (select auth.uid())
  )
);

create or replace function public.enforce_listening_task_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.listening_tasks
    where public.listening_tasks.listening_exercise_id = new.listening_exercise_id
  ) >= 3 then
    raise exception 'A listening exercise can have at most 3 tasks';
  end if;

  return new;
end;
$$;

drop trigger if exists listening_tasks_enforce_limit on public.listening_tasks;
create trigger listening_tasks_enforce_limit
before insert on public.listening_tasks
for each row
execute function public.enforce_listening_task_limit();

grant usage, select on sequence public.listening_tasks_id_seq to authenticated;
grant select, insert, update, delete on table public.listening_tasks to authenticated;
revoke all on table public.listening_tasks from anon, public;

-- ---------------------------------------------------------------------------
-- move existing exercise text/audio into task 1
-- ---------------------------------------------------------------------------
insert into public.listening_tasks (
  listening_exercise_id,
  position,
  original_text,
  audio_base64,
  audio_mime_type
)
select
  public.listening_exercises.id,
  1,
  public.listening_exercises.original_text,
  public.listening_exercises.audio_base64,
  public.listening_exercises.audio_mime_type
from public.listening_exercises
where not exists (
  select 1
  from public.listening_tasks
  where public.listening_tasks.listening_exercise_id = public.listening_exercises.id
);

-- ---------------------------------------------------------------------------
-- questions belong to a task rather than directly to the exercise
-- ---------------------------------------------------------------------------
alter table public.listening_questions
  add column if not exists listening_task_id bigint;

update public.listening_questions
set listening_task_id = public.listening_tasks.id
from public.listening_tasks
where public.listening_tasks.listening_exercise_id = public.listening_questions.listening_exercise_id
  and public.listening_tasks.position = 1
  and public.listening_questions.listening_task_id is null;

-- leftover questions without a task cannot be used; remove them before the
-- not-null constraint is added.
delete from public.listening_questions
where public.listening_questions.listening_task_id is null;

alter table public.listening_questions
  alter column listening_task_id set not null;

alter table public.listening_questions
  drop constraint if exists listening_questions_listening_task_id_fkey;

alter table public.listening_questions
  add constraint listening_questions_listening_task_id_fkey
  foreign key (listening_task_id)
  references public.listening_tasks (id)
  on delete cascade;

alter table public.listening_questions
  drop constraint if exists listening_questions_listening_exercise_id_position_key;

create unique index if not exists listening_questions_task_id_position_key
  on public.listening_questions (listening_task_id, position);

create index if not exists listening_questions_task_id_idx
  on public.listening_questions (listening_task_id);

-- replace question rls so it follows the task -> exercise ownership chain
drop policy if exists "Teachers can read questions for their exercises" on public.listening_questions;
create policy "Teachers can read questions for their exercises"
on public.listening_questions
for select
to authenticated
using (
  listening_task_id in (
    select public.listening_tasks.id
    from public.listening_tasks
    where public.listening_tasks.listening_exercise_id in (
      select public.listening_exercises.id
      from public.listening_exercises
      where public.listening_exercises.created_by = (select auth.uid())
    )
  )
);

drop policy if exists "Teachers can insert questions for their exercises" on public.listening_questions;
create policy "Teachers can insert questions for their exercises"
on public.listening_questions
for insert
to authenticated
with check (
  listening_task_id in (
    select public.listening_tasks.id
    from public.listening_tasks
    where public.listening_tasks.listening_exercise_id in (
      select public.listening_exercises.id
      from public.listening_exercises
      where public.listening_exercises.created_by = (select auth.uid())
        and public.is_teacher()
    )
  )
);

drop policy if exists "Teachers can update questions for their exercises" on public.listening_questions;
create policy "Teachers can update questions for their exercises"
on public.listening_questions
for update
to authenticated
using (
  listening_task_id in (
    select public.listening_tasks.id
    from public.listening_tasks
    where public.listening_tasks.listening_exercise_id in (
      select public.listening_exercises.id
      from public.listening_exercises
      where public.listening_exercises.created_by = (select auth.uid())
    )
  )
)
with check (
  listening_task_id in (
    select public.listening_tasks.id
    from public.listening_tasks
    where public.listening_tasks.listening_exercise_id in (
      select public.listening_exercises.id
      from public.listening_exercises
      where public.listening_exercises.created_by = (select auth.uid())
        and public.is_teacher()
    )
  )
);

drop policy if exists "Teachers can delete questions for their exercises" on public.listening_questions;
create policy "Teachers can delete questions for their exercises"
on public.listening_questions
for delete
to authenticated
using (
  listening_task_id in (
    select public.listening_tasks.id
    from public.listening_tasks
    where public.listening_tasks.listening_exercise_id in (
      select public.listening_exercises.id
      from public.listening_exercises
      where public.listening_exercises.created_by = (select auth.uid())
    )
  )
);

alter table public.listening_questions
  drop constraint if exists listening_questions_listening_exercise_id_fkey;

alter table public.listening_questions
  drop column if exists listening_exercise_id;

comment on table public.listening_questions is
  'Comprehension questions for one task in a listening exercise. Student answers are checked against the task text, not stored here.';

-- ---------------------------------------------------------------------------
-- replace lookup / save / update functions before dropping old columns
-- ---------------------------------------------------------------------------
drop function if exists public.get_listening_exercise_by_code(text);
drop function if exists public.save_listening_exercise(text, text, text, jsonb);
drop function if exists public.update_listening_exercise_questions(text, jsonb);

create or replace function public.get_listening_exercise_by_code(p_access_code text)
returns table (
  id bigint,
  access_code text,
  tasks jsonb
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
    coalesce(
      (
        select jsonb_agg(task_row.task order by task_row.position)
        from (
          select
            listening_tasks.position,
            jsonb_build_object(
              'position', listening_tasks.position,
              'original_text', listening_tasks.original_text,
              'audio_base64', listening_tasks.audio_base64,
              'audio_mime_type', listening_tasks.audio_mime_type,
              'questions', coalesce(
                (
                  select jsonb_agg(
                    jsonb_build_object(
                      'question', listening_questions.question
                    )
                    order by listening_questions.position
                  )
                  from public.listening_questions
                  where listening_questions.listening_task_id = listening_tasks.id
                ),
                '[]'::jsonb
              )
            ) as task
          from public.listening_tasks
          where listening_tasks.listening_exercise_id = listening_exercises.id
        ) as task_row
      ),
      '[]'::jsonb
    ) as tasks
  from public.listening_exercises
  where listening_exercises.access_code = normalized_code;
end;
$$;

comment on function public.get_listening_exercise_by_code(text) is
  'Returns one listening exercise and its tasks when the 4-character code matches. Callable without login.';

revoke all on function public.get_listening_exercise_by_code(text) from public;
grant execute on function public.get_listening_exercise_by_code(text) to anon, authenticated;

create or replace function public.save_listening_exercise(p_tasks jsonb)
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
  new_task_id bigint;
  task jsonb;
  item jsonb;
  questions jsonb;
  task_idx integer;
  question_idx integer;
begin
  if not public.is_teacher() then
    raise exception 'Only teachers can save listening exercises'
      using errcode = '42501';
  end if;

  if p_tasks is null or jsonb_typeof(p_tasks) <> 'array'
    or jsonb_array_length(p_tasks) < 1
    or jsonb_array_length(p_tasks) > 3 then
    raise exception 'A listening exercise must have between 1 and 3 tasks';
  end if;

  insert into public.listening_exercises (created_by)
  values ((select auth.uid()))
  returning public.listening_exercises.id, public.listening_exercises.access_code
  into new_id, new_code;

  for task_idx in 0 .. jsonb_array_length(p_tasks) - 1 loop
    task := p_tasks -> task_idx;

    if coalesce(char_length(trim(task->>'original_text')), 0) = 0 then
      raise exception 'Original text is required';
    end if;

    if coalesce(char_length(task->>'audio_base64'), 0) = 0 then
      raise exception 'Audio is required';
    end if;

    questions := task->'questions';
    if questions is null or jsonb_typeof(questions) <> 'array' or jsonb_array_length(questions) = 0 then
      raise exception 'At least one question is required';
    end if;

    insert into public.listening_tasks (
      listening_exercise_id,
      position,
      original_text,
      audio_base64,
      audio_mime_type
    )
    values (
      new_id,
      task_idx + 1,
      trim(task->>'original_text'),
      task->>'audio_base64',
      coalesce(nullif(task->>'audio_mime_type', ''), 'audio/mpeg')
    )
    returning public.listening_tasks.id
    into new_task_id;

    for question_idx in 0 .. jsonb_array_length(questions) - 1 loop
      item := questions -> question_idx;
      insert into public.listening_questions (
        listening_task_id,
        position,
        question
      )
      values (
        new_task_id,
        question_idx + 1,
        coalesce(item->>'question', '')
      );
    end loop;
  end loop;

  return query select new_id, new_code;
end;
$$;

comment on function public.save_listening_exercise(jsonb) is
  'Lets a teacher save a listening exercise with 1-3 tasks atomically. Returns the generated access code.';

revoke all on function public.save_listening_exercise(jsonb) from public;
grant execute on function public.save_listening_exercise(jsonb) to authenticated;

create or replace function public.update_listening_exercise_questions(
  p_access_code text,
  p_task_position integer,
  p_questions jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_task_id bigint;
  item jsonb;
  idx integer;
  normalized_code text;
begin
  if not public.is_teacher() then
    raise exception 'Only teachers can update listening exercises'
      using errcode = '42501';
  end if;

  normalized_code := upper(trim(p_access_code));

  if normalized_code is null or char_length(normalized_code) <> 4 then
    raise exception 'Invalid access code';
  end if;

  if p_task_position is null or p_task_position < 1 or p_task_position > 3 then
    raise exception 'Task position must be between 1 and 3';
  end if;

  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'At least one question is required';
  end if;

  select public.listening_tasks.id
  into target_task_id
  from public.listening_tasks
  join public.listening_exercises
    on public.listening_exercises.id = public.listening_tasks.listening_exercise_id
  where public.listening_exercises.access_code = normalized_code
    and public.listening_exercises.created_by = (select auth.uid())
    and public.listening_tasks.position = p_task_position;

  if target_task_id is null then
    raise exception 'Listening exercise not found'
      using errcode = 'P0002';
  end if;

  delete from public.listening_questions
  where public.listening_questions.listening_task_id = target_task_id;

  for idx in 0 .. jsonb_array_length(p_questions) - 1 loop
    item := p_questions -> idx;
    insert into public.listening_questions (
      listening_task_id,
      position,
      question
    )
    values (
      target_task_id,
      idx + 1,
      coalesce(item->>'question', '')
    );
  end loop;
end;
$$;

comment on function public.update_listening_exercise_questions(text, integer, jsonb) is
  'Lets a teacher replace all questions on one task of a listening exercise they own.';

revoke all on function public.update_listening_exercise_questions(text, integer, jsonb) from public;
grant execute on function public.update_listening_exercise_questions(text, integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- exercise-level text/audio now live on listening_tasks
-- ---------------------------------------------------------------------------
alter table public.listening_exercises
  drop column if exists original_text;

alter table public.listening_exercises
  drop column if exists audio_base64;

alter table public.listening_exercises
  drop column if exists audio_mime_type;

comment on table public.listening_exercises is
  'Saved listening exercises opened by a 4-character access_code. Content lives in listening_tasks.';
