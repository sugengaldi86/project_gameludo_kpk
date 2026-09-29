-- Alur pembelajaran: landing content, 5 uraian lalu 10 pilihan ganda,
-- serta satu pion yang langsung berada pada kotak start.

create table if not exists public.learning_contents (
  id uuid primary key default uuid_generate_v4(),
  content_type text not null check (content_type in ('objective', 'material')),
  title text not null,
  body text not null,
  image_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions
  add column if not exists question_type text not null default 'multiple_choice',
  add column if not exists answer_know text,
  add column if not exists answer_asked text,
  add column if not exists answer_plan text,
  add column if not exists answer_solution text,
  add column if not exists answer_check text,
  add column if not exists score_weight integer not null default 10,
  add column if not exists display_order integer not null default 0;

-- Samakan constraint dengan nilai kesulitan yang digunakan aplikasi saat ini.
-- Bagian ini membuat migration lama tetap aman bila dijalankan ulang setelah
-- migration 20261011.
alter table public.questions
  drop constraint if exists questions_difficulty_check;

update public.questions
set difficulty = case
  when difficulty = 'tiga_bilangan' then 'hots'
  when difficulty = 'kontekstual' then 'sedang'
  else coalesce(difficulty, 'sedang')
end;

alter table public.questions
  add constraint questions_difficulty_check
  check (difficulty in ('mudah', 'sedang', 'hots'));

do $$ begin
  alter table public.questions add constraint questions_type_check
    check (question_type in ('essay', 'multiple_choice'));
exception when duplicate_object then null; end $$;

create table if not exists public.player_essay_answers (
  id uuid primary key default uuid_generate_v4(),
  game_session_id uuid not null references public.game_sessions(id) on delete cascade,
  turn_id uuid not null references public.game_turns(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  known_answer text not null,
  asked_answer text not null,
  plan_answer text not null default '',
  solution_answer text not null,
  check_answer text not null,
  manual_score numeric,
  reviewed_at timestamptz,
  answered_at timestamptz not null default now(),
  unique (turn_id)
);

alter table public.exams
  add column if not exists essay_question_count integer not null default 5,
  add column if not exists multiple_choice_question_count integer not null default 10;

insert into public.learning_contents(content_type,title,body,display_order)
select 'objective','Tujuan Pembelajaran','Siswa mampu memahami konsep kelipatan, menentukan KPK dua atau tiga bilangan, dan menyelesaikan masalah sehari-hari yang berkaitan dengan KPK.',0
where not exists (select 1 from public.learning_contents where content_type='objective');

insert into public.learning_contents(content_type,title,body,display_order)
select 'material','Mengenal Kelipatan dan KPK','Kelipatan suatu bilangan diperoleh dengan mengalikan bilangan tersebut dengan 1, 2, 3, dan seterusnya. KPK adalah kelipatan persekutuan paling kecil dari dua atau lebih bilangan. KPK dapat dicari dengan menuliskan kelipatan atau menggunakan faktorisasi prima.',0
where not exists (select 1 from public.learning_contents where content_type='material');

insert into public.questions(question_code,story,difficulty,topic,known_information,asked_information,strategy,number_a,number_b,number_c,correct_value,correct_option,final_explanation,is_active,question_type,answer_know,answer_asked,answer_solution,answer_check,score_weight,display_order)
values
('U-KPK-01','Lampu A menyala setiap 4 detik dan lampu B setiap 6 detik. Jika sekarang menyala bersama, berapa detik lagi keduanya menyala bersama?','mudah','kpk','Lampu A 4 detik dan lampu B 6 detik','Waktu keduanya menyala bersama lagi','KPK',4,6,null,12,'A','12 habis dibagi 4 dan 6',true,'essay','4 detik dan 6 detik','Waktu menyala bersama lagi','KPK(4,6)=12','12 merupakan kelipatan 4 dan 6',10,1),
('U-KPK-02','Dina berolahraga setiap 3 hari dan Rani setiap 5 hari. Jika hari ini bersama, berapa hari lagi mereka berolahraga bersama?','mudah','kpk','Dina 3 hari dan Rani 5 hari','Waktu berolahraga bersama lagi','KPK',3,5,null,15,'A','15 habis dibagi 3 dan 5',true,'essay','3 hari dan 5 hari','Waktu bersama lagi','KPK(3,5)=15','15 merupakan kelipatan 3 dan 5',10,2),
('U-KPK-03','Bus merah tiba setiap 8 menit dan bus biru setiap 12 menit. Kapan kedua bus tiba bersama lagi?','sedang','kpk','Bus merah 8 menit dan bus biru 12 menit','Waktu tiba bersama lagi','KPK',8,12,null,24,'A','24 habis dibagi 8 dan 12',true,'essay','8 menit dan 12 menit','Waktu tiba bersama','KPK(8,12)=24','24 merupakan kelipatan 8 dan 12',10,3),
('U-KPK-04','Bel sekolah berbunyi setiap 10 menit dan alarm kelas setiap 15 menit. Berapa menit lagi keduanya berbunyi bersama?','sedang','kpk','Bel 10 menit dan alarm 15 menit','Waktu berbunyi bersama lagi','KPK',10,15,null,30,'A','30 habis dibagi 10 dan 15',true,'essay','10 menit dan 15 menit','Waktu berbunyi bersama','KPK(10,15)=30','30 merupakan kelipatan 10 dan 15',10,4),
('U-KPK-05','Tiga anak berlari mengelilingi lapangan masing-masing selama 4, 6, dan 8 menit. Setelah berapa menit mereka kembali bersama di garis awal?','hots','kpk','Waktu putaran 4, 6, dan 8 menit','Waktu kembali bersama','KPK',4,6,8,24,'A','24 habis dibagi 4, 6, dan 8',true,'essay','4, 6, dan 8 menit','Waktu kembali bersama','KPK(4,6,8)=24','24 merupakan kelipatan ketiganya',10,5)
on conflict(question_code) do update set
  question_type=excluded.question_type,
  difficulty=excluded.difficulty,
  number_c=excluded.number_c;

-- operand_count baru diperkenalkan pada migration 20261007. Jika migration ini
-- dijalankan ulang setelahnya, perbaiki juga jumlah operand seed tiga bilangan.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='questions' and column_name='operand_count'
  ) then
    update public.questions
    set operand_count = case when number_c is null then 2 else 3 end
    where question_code in ('U-KPK-01','U-KPK-02','U-KPK-03','U-KPK-04','U-KPK-05');
  end if;
end $$;

-- Pion aktif selalu mulai dari kotak start. Riwayat permainan selesai tidak diubah.
update public.game_pawns pawn
set status='track', position=0, path_index=0, is_in_base=false,
    is_in_home_track=false, is_finished=false, updated_at=now()
from public.game_sessions session join public.rooms room on room.id=session.room_id
where pawn.game_session_id=session.id and room.status in ('waiting','playing') and pawn.pawn_number=1;

-- Trigger lama sudah menjamin hanya satu pion. Trigger ini berjalan sesudahnya dan
-- menggunakan room_id dari guest_room_sessions untuk menemukan game session.
create or replace function public.place_room_pawns_on_start()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
begin
  update public.game_pawns pawn set status='track', position=0, path_index=0,
    is_in_base=false, is_in_home_track=false, is_finished=false, updated_at=now()
  from public.game_sessions session
  where session.room_id=new.room_id and pawn.game_session_id=session.id and pawn.pawn_number=1;
  return new;
end; $$;

drop trigger if exists guest_room_session_place_pawns_on_start on public.guest_room_sessions;
create trigger guest_room_session_place_pawns_on_start
after insert on public.guest_room_sessions for each row execute function public.place_room_pawns_on_start();

create or replace function public.finalize_completed_game(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_session public.game_sessions; v_winner uuid;
begin
  select * into v_session from public.game_sessions where room_id=p_room_id for update;
  if not found then raise exception 'Sesi permainan tidak ditemukan'; end if;
  select player_id into v_winner from public.room_players where room_id=p_room_id
    order by score desc, correct_answers desc, joined_at asc limit 1;
  update public.rooms set status='finished', finished_at=coalesce(finished_at,now()) where id=p_room_id;
  update public.game_sessions set status='GAME_OVER', winner_player_id=v_winner,
    finished_at=coalesce(finished_at,now()), submitted_at=coalesce(submitted_at,now()) where id=v_session.id;
  return jsonb_build_object('gameOver',true,'winnerId',v_winner);
end; $$;

grant execute on function public.finalize_completed_game(uuid) to service_role;

alter table public.learning_contents enable row level security;
alter table public.player_essay_answers enable row level security;
grant select on public.learning_contents to anon, authenticated;
grant all on public.learning_contents, public.player_essay_answers to service_role;

notify pgrst, 'reload schema';
