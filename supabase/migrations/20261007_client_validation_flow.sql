-- Penyesuaian hasil validasi klien: nomor absen, materi ringkas,
-- urutan tingkat kesulitan, rubrik Polya, dan hasil sementara.

alter table public.profiles
  add column if not exists attendance_number varchar(2);

alter table public.learning_contents
  add column if not exists show_in_briefing boolean not null default true;

alter table public.questions
  add column if not exists operand_count integer not null default 2,
  add column if not exists context_type text not null default 'kontekstual';

alter table public.player_essay_answers
  add column if not exists solution_method text,
  add column if not exists known_score numeric,
  add column if not exists asked_score numeric;

alter table public.exams
  add column if not exists feedback_timing text not null default 'end',
  add column if not exists show_provisional_ranking boolean not null default true,
  add column if not exists passing_score integer not null default 75,
  add column if not exists essay_weight integer not null default 50,
  add column if not exists multiple_choice_weight integer not null default 50,
  add column if not exists participant_mode text not null default 'group';

do $$ begin
  alter table public.exams add constraint exams_feedback_timing_check
    check (feedback_timing in ('immediate','end'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.exams add constraint exams_participant_mode_check
    check (participant_mode in ('group','individual'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.exams add constraint exams_score_weights_check
    check (passing_score between 0 and 100 and essay_weight >= 0 and multiple_choice_weight >= 0 and essay_weight + multiple_choice_weight = 100);
exception when duplicate_object then null; end $$;

update public.questions
set difficulty = case
  when difficulty = 'kontekstual' then 'sedang'
  -- tiga_bilangan dipertahankan: constraint DB tidak mengizinkan nilai 'hots'
  else difficulty
end,
operand_count = case when number_c is null then 2 else 3 end,
context_type = 'kontekstual';


-- Empat tujuan pembelajaran sesuai bahan ajar dan target ketercapaian 75%.
update public.learning_contents set is_active=false where content_type='objective';
insert into public.learning_contents(content_type,title,body,display_order,is_active,show_in_briefing)
select 'objective', seed.title, seed.body, seed.position, true, false
from (values
  ('Memahami konsep KPK','Menjelaskan konsep kelipatan, kelipatan persekutuan, dan KPK dengan tepat.',1),
  ('Memahami masalah','Mengidentifikasi informasi yang diketahui dan ditanyakan dalam soal cerita KPK.',2),
  ('Merencanakan penyelesaian','Memilih strategi yang tepat untuk menyelesaikan masalah KPK.',3),
  ('Menyelesaikan dan memeriksa','Melaksanakan perhitungan serta memeriksa kembali kebenaran jawaban.',4)
) as seed(title,body,position)
where not exists (
  select 1 from public.learning_contents item
  where item.content_type='objective' and lower(item.title)=lower(seed.title)
);

-- Bahan ajar dipecah menjadi bagian yang dapat diurutkan dan dipilih untuk briefing.
insert into public.learning_contents(content_type,title,body,display_order,is_active,show_in_briefing)
select 'material', seed.title, seed.body, seed.position, true, seed.briefing
from (values
  ('Pengertian Kelipatan','Kelipatan adalah hasil kali suatu bilangan dengan bilangan asli 1, 2, 3, dan seterusnya.',10,true),
  ('Kelipatan Persekutuan','Kelipatan persekutuan adalah kelipatan yang sama dari dua bilangan atau lebih.',20,true),
  ('Pengertian KPK','KPK adalah bilangan paling kecil di antara seluruh kelipatan persekutuan.',30,true),
  ('Mendaftar Kelipatan','Tuliskan kelipatan setiap bilangan, kemudian pilih kelipatan persekutuan yang paling kecil.',40,true),
  ('Faktorisasi Prima','Uraikan bilangan menjadi faktor prima, lalu ambil setiap faktor dengan pangkat tertinggi.',50,true),
  ('Pembagian Berulang atau Sengkedan','Bagi bilangan secara bertahap dengan bilangan prima, kemudian kalikan seluruh pembaginya.',60,false),
  ('Contoh Soal Cerita','Tentukan informasi yang diketahui dan ditanyakan, pilih cara penyelesaian, hitung KPK, lalu periksa kembali hasilnya.',70,false),
  ('Empat Tahap Pemecahan Masalah','Memahami masalah, merencanakan penyelesaian, melaksanakan rencana, dan memeriksa kembali.',80,true)
) as seed(title,body,position,briefing)
where not exists (
  select 1 from public.learning_contents item
  where item.content_type='material' and lower(item.title)=lower(seed.title)
);

-- Koreksi soal lampu hias: KPK 10 dan 15 adalah 30, yaitu pilihan C.
update public.questions
set correct_option='C', correct_value=30
where lower(story) like '%lampu hias merah%10%lampu hias kuning%15%';

update public.question_options option_row
set is_correct = option_row.option_key = 'C'
from public.questions question_row
where option_row.question_id=question_row.id
  and lower(question_row.story) like '%lampu hias merah%10%lampu hias kuning%15%';

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
    insert into questions(question_code,story,difficulty,topic,known_information,asked_information,strategy,
      number_a,number_b,number_c,operand_count,context_type,correct_value,correct_option,final_explanation,is_active)
    values(p_question->>'question_code',p_question->>'story',p_question->>'difficulty',p_question->>'topic',
      p_question->>'known_information',p_question->>'asked_information',p_question->>'strategy',
      (p_question->>'number_a')::integer,(p_question->>'number_b')::integer,nullif(p_question->>'number_c','')::integer,
      coalesce((p_question->>'operand_count')::integer,2),coalesce(p_question->>'context_type','kontekstual'),
      (p_question->>'correct_value')::integer,p_question->>'correct_option',p_question->>'final_explanation',(p_question->>'is_active')::boolean)
    returning * into v_question;
  else
    update questions set question_code=p_question->>'question_code',story=p_question->>'story',difficulty=p_question->>'difficulty',
      topic=p_question->>'topic',known_information=p_question->>'known_information',asked_information=p_question->>'asked_information',
      strategy=p_question->>'strategy',number_a=(p_question->>'number_a')::integer,number_b=(p_question->>'number_b')::integer,
      number_c=nullif(p_question->>'number_c','')::integer,operand_count=coalesce((p_question->>'operand_count')::integer,2),
      context_type=coalesce(p_question->>'context_type','kontekstual'),correct_value=(p_question->>'correct_value')::integer,
      correct_option=p_question->>'correct_option',final_explanation=p_question->>'final_explanation',is_active=(p_question->>'is_active')::boolean
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
