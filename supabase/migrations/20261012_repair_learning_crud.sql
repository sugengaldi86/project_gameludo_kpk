-- Migration gabungan untuk memastikan CRUD Materi, Tujuan Pembelajaran,
-- dan Soal Uraian mempunyai seluruh tabel/kolom yang dibutuhkan aplikasi.
begin;

create extension if not exists "uuid-ossp";

create table if not exists public.learning_contents (
  id uuid primary key default uuid_generate_v4(),
  content_type text not null,
  title text not null,
  body text not null,
  image_url text,
  display_order integer not null default 0,
  show_in_briefing boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_contents
  add column if not exists image_url text,
  add column if not exists display_order integer not null default 0,
  add column if not exists show_in_briefing boolean not null default true,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.questions
  add column if not exists question_type text not null default 'multiple_choice',
  add column if not exists answer_know text,
  add column if not exists answer_asked text,
  add column if not exists answer_plan text,
  add column if not exists answer_solution text,
  add column if not exists answer_check text,
  add column if not exists score_weight integer not null default 10,
  add column if not exists display_order integer not null default 0,
  add column if not exists operand_count integer not null default 2,
  add column if not exists context_type text not null default 'kontekstual';

update public.questions
set difficulty = case
  when difficulty = 'tiga_bilangan' then 'hots'
  when difficulty = 'kontekstual' then 'sedang'
  else coalesce(difficulty, 'sedang')
end;

update public.questions
set operand_count = case when number_c is null then 2 else 3 end
where operand_count not in (2, 3) or operand_count is null;

alter table public.learning_contents
  drop constraint if exists learning_contents_content_type_check;
alter table public.learning_contents
  add constraint learning_contents_content_type_check
  check (content_type in ('objective', 'material'));

alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (question_type in ('essay', 'multiple_choice'));

alter table public.questions drop constraint if exists questions_difficulty_check;
alter table public.questions add constraint questions_difficulty_check
  check (difficulty in ('mudah', 'sedang', 'hots'));

alter table public.questions drop constraint if exists questions_operand_count_check;
alter table public.questions add constraint questions_operand_count_check
  check (operand_count in (2, 3));

alter table public.learning_contents enable row level security;
grant select on public.learning_contents to anon, authenticated;
grant all on public.learning_contents to service_role;

commit;

notify pgrst, 'reload schema';
