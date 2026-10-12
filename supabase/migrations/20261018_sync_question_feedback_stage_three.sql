-- Gunakan answer_solution sebagai satu sumber teks Tahap 3 untuk soal pilihan ganda.
-- Fungsi ini juga mempertahankan field tersebut setiap admin membuat atau mengedit soal.
create or replace function public.save_admin_question(
  p_question_id uuid,
  p_question jsonb,
  p_options jsonb,
  p_solutions jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_question questions;
begin
  if p_question_id is null then
    insert into questions(
      question_code, story, difficulty, topic, known_information, asked_information,
      strategy, answer_solution, answer_solution_image_url, number_a, number_b, number_c, operand_count,
      context_type, correct_value, correct_option, final_explanation, is_active
    ) values (
      p_question->>'question_code', p_question->>'story', p_question->>'difficulty', p_question->>'topic',
      p_question->>'known_information', p_question->>'asked_information', p_question->>'strategy',
      nullif(p_question->>'answer_solution',''), nullif(p_question->>'answer_solution_image_url',''), (p_question->>'number_a')::integer,
      (p_question->>'number_b')::integer, nullif(p_question->>'number_c','')::integer,
      coalesce((p_question->>'operand_count')::integer,2), coalesce(p_question->>'context_type','kontekstual'),
      (p_question->>'correct_value')::integer, p_question->>'correct_option',
      p_question->>'final_explanation', (p_question->>'is_active')::boolean
    ) returning * into v_question;
  else
    update questions set
      question_code=p_question->>'question_code', story=p_question->>'story', difficulty=p_question->>'difficulty',
      topic=p_question->>'topic', known_information=p_question->>'known_information',
      asked_information=p_question->>'asked_information', strategy=p_question->>'strategy',
      answer_solution=nullif(p_question->>'answer_solution',''),
      answer_solution_image_url=nullif(p_question->>'answer_solution_image_url',''), number_a=(p_question->>'number_a')::integer,
      number_b=(p_question->>'number_b')::integer, number_c=nullif(p_question->>'number_c','')::integer,
      operand_count=coalesce((p_question->>'operand_count')::integer,2),
      context_type=coalesce(p_question->>'context_type','kontekstual'),
      correct_value=(p_question->>'correct_value')::integer, correct_option=p_question->>'correct_option',
      final_explanation=p_question->>'final_explanation', is_active=(p_question->>'is_active')::boolean
    where id=p_question_id returning * into v_question;
    if not found then raise exception 'Soal tidak ditemukan'; end if;
    delete from question_options where question_id=p_question_id;
    delete from question_solutions where question_id=p_question_id;
  end if;

  insert into question_options(question_id,option_key,option_text,is_correct)
  select v_question.id,option_key,option_text,is_correct
  from jsonb_to_recordset(p_options) as row_data(option_key text,option_text text,is_correct boolean);
  insert into question_solutions(question_id,method,steps,result)
  select v_question.id,method,steps,result
  from jsonb_to_recordset(p_solutions) as row_data(method text,steps jsonb,result integer);
  return to_jsonb(v_question);
end; $$;

grant execute on function public.save_admin_question(uuid,jsonb,jsonb,jsonb) to service_role;
notify pgrst, 'reload schema';
