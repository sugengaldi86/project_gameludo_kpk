-- Pulihkan TP pada database yang sudah menjalankan migration lama.
-- Jalankan file ini di Supabase SQL Editor untuk memperbaiki data production.
begin;

with objective_seed(title, body, display_order) as (
  values
    ('Memahami konsep KPK', 'Melalui media pembelajaran Ludo Web, murid kelas V mampu menjelaskan konsep kelipatan, kelipatan persekutuan, dan KPK dari dua bilangan dengan tepat, minimal 75% dari soal yang diberikan.', 1),
    ('Memahami masalah', 'Melalui media pembelajaran Ludo Web, murid kelas V mampu mengidentifikasi informasi yang diketahui dan ditanyakan dari soal cerita yang berkaitan dengan KPK dengan tepat, minimal 75% dari soal yang diberikan.', 2),
    ('Merencanakan penyelesaian', 'Melalui media pembelajaran Ludo Web, murid kelas V mampu menyusun strategi penyelesaian masalah kontekstual yang melibatkan dua bilangan menggunakan konsep KPK dengan tepat, minimal 75% dari soal yang diberikan.', 3),
    ('Menyelesaikan dan memeriksa', 'Melalui media pembelajaran Ludo Web, murid kelas V mampu menyelesaikan masalah kontekstual sehari-hari menggunakan KPK dari dua bilangan serta memeriksa kembali ketepatan jawaban yang diperoleh secara tepat dan konsisten, minimal 75% dari soal yang diberikan.', 4)
)
insert into public.learning_contents (
  content_type, title, body, display_order, show_in_briefing, is_active
)
select 'objective', seed.title, seed.body, seed.display_order, false, true
from objective_seed seed
where not exists (
  select 1 from public.learning_contents existing
  where existing.content_type = 'objective'
    and lower(existing.title) = lower(seed.title)
);

update public.learning_contents
set is_active = false, updated_at = now()
where content_type = 'objective';

with objective_seed(title, body, display_order) as (
  values
    ('Memahami konsep KPK', 'Melalui media pembelajaran Ludo Web, murid kelas V mampu menjelaskan konsep kelipatan, kelipatan persekutuan, dan KPK dari dua bilangan dengan tepat, minimal 75% dari soal yang diberikan.', 1),
    ('Memahami masalah', 'Melalui media pembelajaran Ludo Web, murid kelas V mampu mengidentifikasi informasi yang diketahui dan ditanyakan dari soal cerita yang berkaitan dengan KPK dengan tepat, minimal 75% dari soal yang diberikan.', 2),
    ('Merencanakan penyelesaian', 'Melalui media pembelajaran Ludo Web, murid kelas V mampu menyusun strategi penyelesaian masalah kontekstual yang melibatkan dua bilangan menggunakan konsep KPK dengan tepat, minimal 75% dari soal yang diberikan.', 3),
    ('Menyelesaikan dan memeriksa', 'Melalui media pembelajaran Ludo Web, murid kelas V mampu menyelesaikan masalah kontekstual sehari-hari menggunakan KPK dari dua bilangan serta memeriksa kembali ketepatan jawaban yang diperoleh secara tepat dan konsisten, minimal 75% dari soal yang diberikan.', 4)
),
ranked_objectives as (
  select item.id, lower(item.title) as normalized_title,
    row_number() over (
      partition by lower(item.title)
      order by item.created_at nulls last, item.id
    ) as duplicate_rank
  from public.learning_contents item
  join objective_seed seed on lower(seed.title) = lower(item.title)
  where item.content_type = 'objective'
)
update public.learning_contents item
set body = seed.body,
    display_order = seed.display_order,
    show_in_briefing = false,
    is_active = ranked.duplicate_rank = 1,
    updated_at = now()
from ranked_objectives ranked
join objective_seed seed on lower(seed.title) = ranked.normalized_title
where item.id = ranked.id;

commit;
notify pgrst, 'reload schema';
