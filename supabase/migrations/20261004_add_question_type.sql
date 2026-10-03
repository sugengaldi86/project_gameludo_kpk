ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'multiple_choice';

ALTER TABLE public.questions
  ALTER COLUMN question_type SET DEFAULT 'multiple_choice';

CREATE OR REPLACE FUNCTION public.save_admin_question(
  p_question_id uuid,
  p_question jsonb,
  p_options jsonb,
  p_solutions jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question questions;
begin
  if p_question_id is null then
    insert into questions (
      question_code, story, question_type, difficulty, topic,
      known_information, asked_information, strategy,
      number_a, number_b, number_c, correct_value,
      correct_option, final_explanation, is_active
    )
    values (
      p_question->>'question_code',
      p_question->>'story',
      coalesce(nullif(p_question->>'question_type', ''), 'multiple_choice'),
      p_question->>'difficulty',
      p_question->>'topic',
      p_question->>'known_information',
      p_question->>'asked_information',
      p_question->>'strategy',
      (p_question->>'number_a')::integer,
      (p_question->>'number_b')::integer,
      (p_question->>'number_c')::integer,
      (p_question->>'correct_value')::integer,
      coalesce(nullif(p_question->>'correct_option', ''), 'A'),
      p_question->>'final_explanation',
      (p_question->>'is_active')::boolean
    )
    returning * into v_question;
  else
    update questions set
      question_code = p_question->>'question_code',
      story = p_question->>'story',
      question_type = coalesce(nullif(p_question->>'question_type', ''), 'multiple_choice'),
      difficulty = p_question->>'difficulty',
      topic = p_question->>'topic',
      known_information = p_question->>'known_information',
      asked_information = p_question->>'asked_information',
      strategy = p_question->>'strategy',
      number_a = (p_question->>'number_a')::integer,
      number_b = (p_question->>'number_b')::integer,
      number_c = (p_question->>'number_c')::integer,
      correct_value = (p_question->>'correct_value')::integer,
      correct_option = coalesce(nullif(p_question->>'correct_option', ''), 'A'),
      final_explanation = p_question->>'final_explanation',
      is_active = (p_question->>'is_active')::boolean
    where id = p_question_id returning * into v_question;
    if not found then raise exception 'Soal tidak ditemukan'; end if;
    delete from question_options where question_id = p_question_id;
    delete from question_solutions where question_id = p_question_id;
  end if;

  if coalesce(p_question->>'question_type', 'multiple_choice') = 'multiple_choice' then
    insert into question_options (question_id, option_key, option_text, is_correct)
    select v_question.id, option_key, option_text, is_correct
    from jsonb_to_recordset(p_options) as option_row(option_key text, option_text text, is_correct boolean);
  end if;

  insert into question_solutions (question_id, method, steps, result)
  select v_question.id, method, steps, result
  from jsonb_to_recordset(p_solutions) as solution_row(method text, steps jsonb, result integer);

  return to_jsonb(v_question);
end;
$$;

GRANT ALL ON TABLE public.questions TO service_role;
GRANT ALL ON TABLE public.questions TO authenticated;
GRANT ALL ON TABLE public.questions TO anon;
