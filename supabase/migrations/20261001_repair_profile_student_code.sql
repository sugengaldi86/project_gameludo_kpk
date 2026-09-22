-- Memperbaiki database lama yang belum mempunyai identitas siswa stabil.
alter table public.profiles
  add column if not exists student_code text;

-- Normalisasi data yang mungkin sudah pernah dimasukkan secara manual.
update public.profiles
set student_code = upper(trim(student_code))
where student_code is not null
  and student_code <> upper(trim(student_code));

-- Jika instalasi lama mempunyai kode ganda, pertahankan profil tertua sebagai
-- pemilik kode tersebut. Profil duplikat tetap tersimpan dan dapat diberi kode
-- yang benar pada sesi berikutnya.
with duplicates as (
  select id,
    row_number() over (
      partition by student_code
      order by created_at nulls last, id
    ) as duplicate_number
  from public.profiles
  where student_code is not null
)
update public.profiles profile
set student_code = null
from duplicates
where profile.id = duplicates.id
  and duplicates.duplicate_number > 1;

-- Kode siswa hanya diwajibkan untuk pemain baru melalui create_local_game.
-- Data profil lama tetap boleh bernilai NULL.
create unique index if not exists profiles_student_code_unique
  on public.profiles (student_code)
  where student_code is not null;

create index if not exists profiles_student_code_lookup_idx
  on public.profiles (upper(student_code))
  where student_code is not null;

comment on column public.profiles.student_code is
  'NIS atau kode siswa stabil untuk menghubungkan progres pada beberapa sesi permainan.';

notify pgrst, 'reload schema';
