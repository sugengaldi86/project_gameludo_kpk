-- Memperbaiki instalasi yang sudah mempunyai tabel exams versi awal.
-- CREATE TABLE IF NOT EXISTS tidak menambahkan kolom baru ke tabel lama.
alter table public.exams
  add column if not exists learning_goal text,
  add column if not exists question_time_seconds integer,
  add column if not exists question_count integer,
  add column if not exists difficulty text,
  add column if not exists randomize_questions boolean not null default true,
  add column if not exists randomize_options boolean not null default false,
  add column if not exists late_tolerance_minutes integer not null default 0,
  add column if not exists auto_submit boolean not null default true,
  add column if not exists allow_resume boolean not null default true,
  add column if not exists allow_rejoin boolean not null default true,
  add column if not exists max_attempts integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

alter table public.rooms
  add column if not exists exam_id uuid references public.exams(id) on delete set null;

alter table public.game_sessions
  add column if not exists exam_started_at timestamptz,
  add column if not exists exam_deadline_at timestamptz,
  add column if not exists submitted_at timestamptz;

create table if not exists public.exam_questions (
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exam_id, question_id)
);

-- Kolom opsional ini dipakai instalasi terbaru untuk urutan soal manual.
alter table public.exam_questions add column if not exists position integer;

create index if not exists rooms_exam_id_idx on public.rooms(exam_id);
create index if not exists exam_questions_exam_id_idx on public.exam_questions(exam_id);

grant all on table public.exams to service_role;
grant all on table public.exam_questions to service_role;

-- Meminta PostgREST/Supabase memuat ulang schema cache setelah migrasi.
notify pgrst, 'reload schema';
