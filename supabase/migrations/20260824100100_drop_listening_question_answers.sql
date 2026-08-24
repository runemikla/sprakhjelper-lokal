-- migration: stop storing generated answers for listening questions
-- purpose: teachers only save questions. student answers are checked against
--          the original text by the app, not against a stored key.
-- affected: public.listening_questions.answer, save/update/get functions

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
            'question', listening_questions.question
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
      question
    )
    values (
      new_id,
      idx + 1,
      coalesce(item->>'question', '')
    );
  end loop;

  return query select new_id, new_code;
end;
$$;

create or replace function public.update_listening_exercise_questions(
  p_access_code text,
  p_questions jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id bigint;
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

  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'At least one question is required';
  end if;

  select public.listening_exercises.id
  into target_id
  from public.listening_exercises
  where public.listening_exercises.access_code = normalized_code
    and public.listening_exercises.created_by = (select auth.uid());

  if target_id is null then
    raise exception 'Listening exercise not found'
      using errcode = 'P0002';
  end if;

  delete from public.listening_questions
  where public.listening_questions.listening_exercise_id = target_id;

  for idx in 0 .. jsonb_array_length(p_questions) - 1 loop
    item := p_questions -> idx;
    insert into public.listening_questions (
      listening_exercise_id,
      position,
      question
    )
    values (
      target_id,
      idx + 1,
      coalesce(item->>'question', '')
    );
  end loop;
end;
$$;

alter table public.listening_questions
  drop column if exists answer;

comment on table public.listening_questions is
  'Comprehension questions for a saved listening exercise. Student answers are checked against the original text, not stored here.';

comment on function public.update_listening_exercise_questions(text, jsonb) is
  'Lets a teacher replace all questions on a listening exercise they own.';

comment on function public.save_listening_exercise(text, text, text, jsonb) is
  'Lets a teacher save a listening exercise and its questions atomically. Returns the generated access code.';

revoke all on function public.get_listening_exercise_by_code(text) from public;
grant execute on function public.get_listening_exercise_by_code(text) to anon, authenticated;
