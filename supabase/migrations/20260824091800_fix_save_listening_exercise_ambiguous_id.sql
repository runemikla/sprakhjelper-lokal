-- migration: fix ambiguous id in save_listening_exercise
-- purpose: RETURNS TABLE (id, access_code) made unqualified "id" and
--          "access_code" in RETURNING refer to both table columns and
--          function output variables.
-- affected: public.save_listening_exercise

-- changing the RETURNS TABLE column names requires a drop first
drop function if exists public.save_listening_exercise(text, text, text, jsonb);

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
