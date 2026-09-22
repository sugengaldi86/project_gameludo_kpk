-- Pengaturan ujian terjadwal dan deadline yang ditentukan server.
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 120),
  learning_goal text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  question_time_seconds integer check (question_time_seconds is null or question_time_seconds between 10 and 3600),
  question_count integer check (question_count is null or question_count between 1 and 500),
  difficulty text,
  randomize_questions boolean not null default true,
  randomize_options boolean not null default false,
  late_tolerance_minutes integer not null default 0 check (late_tolerance_minutes between 0 and 1440),
  auto_submit boolean not null default true,
  allow_resume boolean not null default true,
  allow_rejoin boolean not null default true,
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  status text not null default 'draft' check (status in ('draft','scheduled','active','finished','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_schedule_check check (ends_at > starts_at)
);

alter table public.rooms add column if not exists exam_id uuid references public.exams(id) on delete set null;
alter table public.game_sessions add column if not exists exam_started_at timestamptz;
alter table public.game_sessions add column if not exists exam_deadline_at timestamptz;
alter table public.game_sessions add column if not exists submitted_at timestamptz;
create index if not exists rooms_exam_id_idx on public.rooms(exam_id);
create table if not exists public.exam_questions (
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  position integer,
  primary key (exam_id, question_id)
);

create or replace function public.create_local_game(
  p_players jsonb,
  p_learning_goal text default null,
  p_game_mode text default 'klasik',
  p_duration_minutes integer default 30,
  p_exam_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_room rooms; v_session game_sessions; v_player jsonb; v_profile profiles;
  v_exam exams; v_players jsonb := '[]'::jsonb; v_token text := encode(gen_random_bytes(32), 'hex');
  v_code text; v_student_code text; v_index integer := 0; v_now timestamptz := now(); v_deadline timestamptz;
begin
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) not between 2 and 4 then raise exception 'Jumlah pemain harus 2 sampai 4'; end if;
  if p_exam_id is not null then
    select * into v_exam from exams where id = p_exam_id for update;
    if not found then raise exception 'Ujian tidak ditemukan'; end if;
    if v_exam.status not in ('scheduled','active') then raise exception 'Ujian belum dipublikasikan atau sudah selesai'; end if;
    if v_now < v_exam.starts_at then raise exception 'Ujian belum dimulai'; end if;
    if v_now > v_exam.ends_at + make_interval(mins => v_exam.late_tolerance_minutes) then raise exception 'Jadwal masuk ujian sudah berakhir'; end if;
    v_deadline := least(v_now + make_interval(mins => v_exam.duration_minutes), v_exam.ends_at);
    update exams set status = 'active', updated_at = v_now where id = v_exam.id and status = 'scheduled';
  else
    v_deadline := v_now + make_interval(mins => greatest(1, least(p_duration_minutes, 480)));
  end if;
  if exists (select 1 from (select upper(trim(value->>'studentCode')) code from jsonb_array_elements(p_players)) x group by code having code is null or code = '' or count(*) > 1) then
    raise exception 'Kode siswa wajib diisi dan harus berbeda untuk setiap pemain';
  end if;
  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    begin
      insert into rooms(room_code,max_players,game_mode,status,learning_goal,duration_minutes,end_time,started_at,exam_id)
      values(v_code,jsonb_array_length(p_players),p_game_mode,'playing',coalesce(nullif(trim(p_learning_goal),''),v_exam.learning_goal),
        coalesce(v_exam.duration_minutes,p_duration_minutes),v_deadline,v_now,p_exam_id) returning * into v_room; exit;
    exception when unique_violation then end;
  end loop;
  for v_player in select value from jsonb_array_elements(p_players) loop
    if length(trim(coalesce(v_player->>'name',''))) not between 1 and 40 then raise exception 'Nama pemain wajib diisi (maksimal 40 karakter)'; end if;
    if coalesce(v_player->>'color','') not in ('blue','green','yellow','red') then raise exception 'Warna pemain tidak valid'; end if;
    v_student_code := upper(trim(v_player->>'studentCode'));
    if v_student_code !~ '^[A-Z0-9_-]{3,30}$' then raise exception 'Kode siswa harus 3-30 karakter'; end if;
    insert into profiles(student_code,name,avatar) values(v_student_code,trim(v_player->>'name'),left(coalesce(v_player->>'avatar',v_player->>'name'),1))
      on conflict(student_code) where student_code is not null do update set name=excluded.name,avatar=excluded.avatar returning * into v_profile;
    insert into room_players(room_id,player_id,display_name,color,seat_number,is_ready,is_online)
      values(v_room.id,v_profile.id,v_profile.name,v_player->>'color',v_index+1,true,true);
    v_players := v_players || jsonb_build_array(jsonb_build_object('id',v_profile.id,'studentCode',v_profile.student_code,'name',v_profile.name,'avatar',v_profile.avatar,'color',v_player->>'color'));
    if v_index=0 then update rooms set host_player_id=v_profile.id where id=v_room.id; end if; v_index:=v_index+1;
  end loop;
  insert into game_sessions(room_id,current_player_id,current_turn_number,status,started_at,exam_started_at,exam_deadline_at)
    values(v_room.id,(v_players->0->>'id')::uuid,1,'TURN_START',v_now,v_now,v_deadline) returning * into v_session;
  insert into game_pawns(game_session_id,player_id,pawn_number,status,position,path_index,is_in_base,is_in_home_track,is_finished)
    select v_session.id,(player->>'id')::uuid,n,'base',n-1,null,true,false,false from jsonb_array_elements(v_players) player cross join generate_series(1,4) n;
  insert into learning_progress(player_id) select (player->>'id')::uuid from jsonb_array_elements(v_players) player on conflict(player_id) do nothing;
  insert into guest_room_sessions(room_id,token_hash) values(v_room.id,encode(digest(v_token,'sha256'),'hex'));
  return jsonb_build_object('roomCode',v_code,'roomId',v_room.id,'sessionId',v_session.id,'accessToken',v_token,'players',v_players,'deadlineAt',v_deadline);
end; $$;

-- Semua mutasi utama memanggil guard ini dari trigger/procedure yang sudah ada.
create or replace function public.assert_game_deadline(p_room_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_deadline timestamptz; v_status text;
begin
  select coalesce(gs.exam_deadline_at,r.end_time),r.status into v_deadline,v_status from rooms r join game_sessions gs on gs.room_id=r.id where r.id=p_room_id;
  if not found then raise exception 'Room permainan tidak ditemukan'; end if;
  if v_status <> 'playing' then raise exception 'Permainan sudah tidak aktif'; end if;
  if v_deadline is not null and v_deadline <= now() then
    update rooms set status='finished',finished_at=coalesce(finished_at,now()) where id=p_room_id;
    update game_sessions set status='GAME_OVER',submitted_at=coalesce(submitted_at,now()),finished_at=coalesce(finished_at,now()) where room_id=p_room_id;
    raise exception 'Waktu ujian telah habis';
  end if;
end; $$;
