-- Tambah kolom show_in_briefing ke tabel learning_contents
-- Kolom ini menentukan apakah materi ditampilkan di halaman ringkasan pra-permainan

alter table public.learning_contents
  add column if not exists show_in_briefing boolean not null default true;

-- Semua materi yang sudah ada dijadikan show_in_briefing = true (tampil di briefing)
update public.learning_contents
  set show_in_briefing = true
  where content_type = 'material';

notify pgrst, 'reload schema';
