-- Empat tahap Polya dan pengaturan jumlah soal per ujian.
alter table public.questions add column if not exists answer_plan text;
alter table public.player_essay_answers
  add column if not exists plan_answer text not null default '',
  add column if not exists understanding_score numeric,
  add column if not exists planning_score numeric,
  add column if not exists execution_score numeric,
  add column if not exists review_score numeric;

alter table public.exams
  add column if not exists essay_question_count integer not null default 5,
  add column if not exists multiple_choice_question_count integer not null default 10;

update public.learning_contents set is_active=false
where content_type='objective' and title='Tujuan Pembelajaran';

insert into public.learning_contents(content_type,title,body,display_order,is_active)
select seed.kind,seed.title,seed.body,seed.position,true from (values
  ('objective','Memahami masalah','Mengidentifikasi apa yang diketahui, apa yang ditanyakan, serta informasi atau syarat yang terdapat pada soal.',1),
  ('objective','Merencanakan pemecahan','Menyusun strategi, rumus, atau langkah-langkah yang akan digunakan untuk menyelesaikan masalah.',2),
  ('objective','Melaksanakan rencana','Menjalankan strategi dan perhitungan yang sudah direncanakan secara teliti hingga mendapatkan jawaban.',3),
  ('objective','Memeriksa kembali','Mengoreksi atau mengecek ulang proses dan hasil jawaban untuk memastikan kebenarannya.',4)
) as seed(kind,title,body,position)
where not exists(select 1 from public.learning_contents c where c.content_type='objective' and lower(c.title)=lower(seed.title));

update public.questions set answer_plan=coalesce(nullif(answer_plan,''),'Menentukan KPK menggunakan daftar kelipatan atau faktorisasi prima')
where question_type='essay';

notify pgrst, 'reload schema';
