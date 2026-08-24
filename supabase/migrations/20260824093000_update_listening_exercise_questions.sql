-- migration: allow teachers to update questions on their own listening exercises
-- purpose: replace all questions for an exercise in one transaction after the
--          teacher edits them in the ui.
-- affected: public.update_listening_exercise_questions

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
      question,
      answer
    )
    values (
      target_id,
      idx + 1,
      coalesce(item->>'question', ''),
      coalesce(item->>'answer', '')
    );
  end loop;
end;
$$;

comment on function public.update_listening_exercise_questions(text, jsonb) is
  'Lets a teacher replace all questions and answers on a listening exercise they own.';

revoke all on function public.update_listening_exercise_questions(text, jsonb) from public;
grant execute on function public.update_listening_exercise_questions(text, jsonb) to authenticated;
