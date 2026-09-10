-- add open vs statement question types for listening tasks
-- affected: public.listening_questions, get/save/update listening functions
-- special considerations: existing questions stay as open; statement items require is_true

alter table public.listening_questions
  add column if not exists question_type text not null default 'open';

alter table public.listening_questions
  add column if not exists is_true boolean;

alter table public.listening_questions
  drop constraint if exists listening_questions_question_type_check;

alter table public.listening_questions
  add constraint listening_questions_question_type_check
  check (question_type in ('open', 'statement'));

alter table public.listening_questions
  drop constraint if exists listening_questions_statement_requires_answer;

alter table public.listening_questions
  add constraint listening_questions_statement_requires_answer
  check (
    question_type <> 'statement'
    or is_true is not null
  );

comment on column public.listening_questions.question_type is
  'open: free-text comprehension question. statement: true/false claim about the listening text.';

comment on column public.listening_questions.is_true is
  'Correct true/false value for statement questions. Null for open questions.';

-- ---------------------------------------------------------------------------
-- replace lookup / save / update so they persist and return question type
-- ---------------------------------------------------------------------------
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
  -- public lookup by 4-character code; used by students without login
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
                      'question', listening_questions.question,
                      'question_type', listening_questions.question_type,
                      'is_true', listening_questions.is_true
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
  question_type text;
  is_true boolean;
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
      question_type := case
        when item->>'question_type' = 'statement' then 'statement'
        else 'open'
      end;
      is_true := case
        when question_type = 'statement' and item->>'is_true' in ('true', 't') then true
        when question_type = 'statement' and item->>'is_true' in ('false', 'f') then false
        else null
      end;

      insert into public.listening_questions (
        listening_task_id,
        position,
        question,
        question_type,
        is_true
      )
      values (
        new_task_id,
        question_idx + 1,
        coalesce(item->>'question', ''),
        question_type,
        is_true
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
  question_type text;
  is_true boolean;
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
    question_type := case
      when item->>'question_type' = 'statement' then 'statement'
      else 'open'
    end;
    is_true := case
      when question_type = 'statement' and item->>'is_true' in ('true', 't') then true
      when question_type = 'statement' and item->>'is_true' in ('false', 'f') then false
      else null
    end;

    insert into public.listening_questions (
      listening_task_id,
      position,
      question,
      question_type,
      is_true
    )
    values (
      target_task_id,
      idx + 1,
      coalesce(item->>'question', ''),
      question_type,
      is_true
    );
  end loop;
end;
$$;

comment on function public.update_listening_exercise_questions(text, integer, jsonb) is
  'Lets a teacher replace all questions on one task of a listening exercise they own.';

revoke all on function public.update_listening_exercise_questions(text, integer, jsonb) from public;
grant execute on function public.update_listening_exercise_questions(text, integer, jsonb) to authenticated;
