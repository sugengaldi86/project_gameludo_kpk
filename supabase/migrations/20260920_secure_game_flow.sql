create extension if not exists pgcrypto;

alter table public.rooms add column if not exists learning_goal text;
alter table public.player_answers add column if not exists identify_known_correct boolean;
alter table public.player_answers add column if not exists strategy_correct boolean;
alter table public.player_answers add column if not exists verification_correct boolean;

create table if not exists public.guest_room_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now()
);

alter table public.guest_room_sessions enable row level security;

-- Data permainan hanya ditulis dan dibaca melalui Route Handler dengan service role.
alter table public.question_options enable row level security;
alter table public.question_solutions enable row level security;
alter table public.game_turns enable row level security;
alter table public.player_answers enable row level security;
alter table public.learning_progress enable row level security;
alter table public.missions enable row level security;
alter table public.player_missions enable row level security;
alter table public.badges enable row level security;
alter table public.player_badges enable row level security;
alter table public.game_events enable row level security;

revoke all on table public.admins, public.guest_room_sessions,
  public.question_options, public.question_solutions, public.game_turns,
  public.player_answers, public.learning_progress, public.missions,
  public.player_missions, public.badges, public.player_badges,
  public.game_events from anon, authenticated;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Rooms are viewable by everyone." on public.rooms;
drop policy if exists "Room players are viewable by everyone." on public.room_players;
drop policy if exists "Game sessions are viewable by everyone." on public.game_sessions;
drop policy if exists "Game pawns are viewable by everyone." on public.game_pawns;
drop policy if exists "Questions are viewable by everyone." on public.questions;
revoke all on table public.profiles, public.rooms, public.room_players,
  public.game_sessions, public.game_pawns, public.questions from anon, authenticated;

create or replace function public.create_local_game(
  p_players jsonb,
  p_learning_goal text default null,
  p_game_mode text default 'klasik'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room rooms;
  v_session game_sessions;
  v_player jsonb;
  v_profile profiles;
  v_players jsonb := '[]'::jsonb;
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_code text;
  v_index integer := 0;
  v_pawn_count integer := case when p_game_mode = 'cepat' then 1 else 4 end;
begin
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) not between 2 and 4 then
    raise exception 'Jumlah pemain harus 2 sampai 4';
  end if;
  if p_game_mode not in ('cepat', 'klasik') then
    raise exception 'Mode permainan tidak valid';
  end if;

  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    begin
      insert into rooms (room_code, max_players, game_mode, status, learning_goal, started_at)
      values (v_code, jsonb_array_length(p_players), p_game_mode, 'playing', nullif(trim(p_learning_goal), ''), now())
      returning * into v_room;
      exit;
    exception when unique_violation then
      -- Coba kode baru tanpa mengembalikan error 500 kepada pemain.
    end;
  end loop;

  for v_player in select value from jsonb_array_elements(p_players)
  loop
    if length(trim(coalesce(v_player->>'name', ''))) not between 1 and 40 then
      raise exception 'Nama pemain wajib diisi (maksimal 40 karakter)';
    end if;
    if coalesce(v_player->>'color', '') not in ('blue', 'green', 'yellow', 'red') then
      raise exception 'Warna pemain tidak valid';
    end if;

    insert into profiles (name, avatar)
    values (trim(v_player->>'name'), left(coalesce(v_player->>'avatar', v_player->>'name'), 1))
    returning * into v_profile;

    insert into room_players (room_id, player_id, display_name, color, seat_number, is_ready, is_online)
    values (v_room.id, v_profile.id, v_profile.name, v_player->>'color', v_index + 1, true, true);

    v_players := v_players || jsonb_build_array(jsonb_build_object(
      'id', v_profile.id,
      'name', v_profile.name,
      'avatar', v_profile.avatar,
      'color', v_player->>'color',
      'seatNumber', v_index + 1,
      'score', 0,
      'xp', 0,
      'level', 1,
      'active', v_index = 0
    ));

    if v_index = 0 then
      update rooms set host_player_id = v_profile.id where id = v_room.id;
    end if;
    v_index := v_index + 1;
  end loop;

  insert into game_sessions (room_id, current_player_id, current_turn_number, status, started_at)
  values (v_room.id, (v_players->0->>'id')::uuid, 1, 'TURN_START', now())
  returning * into v_session;

  insert into game_pawns (game_session_id, player_id, pawn_number, status, position, path_index, is_in_base, is_in_home_track, is_finished)
  select v_session.id, (player->>'id')::uuid, pawn_number, 'base', pawn_number - 1, null, true, false, false
  from jsonb_array_elements(v_players) player
  cross join generate_series(1, v_pawn_count) pawn_number;

  insert into learning_progress (player_id)
  select (player->>'id')::uuid from jsonb_array_elements(v_players) player
  on conflict (player_id) do nothing;

  insert into guest_room_sessions (room_id, token_hash)
  values (v_room.id, encode(digest(v_token, 'sha256'), 'hex'));

  return jsonb_build_object(
    'roomCode', v_code,
    'roomId', v_room.id,
    'sessionId', v_session.id,
    'accessToken', v_token,
    'players', v_players
  );
end;
$$;

create or replace function public.roll_game_turn(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session game_sessions;
  v_question questions;
  v_dice integer := floor(random() * 6 + 1)::integer;
  v_previous_question uuid;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found then raise exception 'Sesi permainan tidak ditemukan'; end if;
  if v_session.status <> 'TURN_START' then raise exception 'Dadu sudah dilempar atau state tidak valid'; end if;

  select question_id into v_previous_question
  from game_turns where game_session_id = v_session.id
  order by turn_number desc limit 1;

  select * into v_question from questions
  where is_active = true and (id <> v_previous_question or v_previous_question is null)
  order by random() limit 1;
  if not found then
    select * into v_question from questions where is_active = true order by random() limit 1;
  end if;
  if not found then raise exception 'Bank soal aktif masih kosong'; end if;

  update game_sessions set current_dice_value = v_dice, status = 'QUIZ' where id = v_session.id;
  insert into game_turns (game_session_id, turn_number, player_id, dice_value, question_id)
  values (v_session.id, v_session.current_turn_number, v_session.current_player_id, v_dice, v_question.id);

  return jsonb_build_object('diceValue', v_dice, 'questionId', v_question.id, 'playerId', v_session.current_player_id);
end;
$$;

create or replace function public.answer_game_turn(
  p_room_id uuid,
  p_question_id uuid,
  p_selected_option text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session game_sessions;
  v_turn game_turns;
  v_question questions;
  v_correct boolean;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found or v_session.status <> 'QUIZ' then raise exception 'State permainan tidak valid'; end if;

  select * into v_turn from game_turns
  where game_session_id = v_session.id and turn_number = v_session.current_turn_number
  for update;
  if not found or v_turn.question_id <> p_question_id then raise exception 'Soal bukan milik giliran aktif'; end if;

  select * into v_question from questions where id = p_question_id and is_active = true;
  if not found then raise exception 'Soal tidak ditemukan'; end if;
  v_correct := upper(p_selected_option) = v_question.correct_option;

  update game_turns set is_correct = v_correct where id = v_turn.id;
  insert into player_answers (game_session_id, turn_id, player_id, question_id, selected_option, is_correct, score_awarded, xp_awarded)
  values (v_session.id, v_turn.id, v_session.current_player_id, v_question.id, upper(p_selected_option), v_correct,
    case when v_correct then 10 else 0 end, case when v_correct then 10 else 0 end);

  update room_players set
    score = score + case when v_correct then 10 else 0 end,
    xp_earned = xp_earned + case when v_correct then 10 else 0 end,
    correct_answers = correct_answers + case when v_correct then 1 else 0 end,
    wrong_answers = wrong_answers + case when v_correct then 0 else 1 end,
    streak = case when v_correct then streak + 1 else 0 end
  where room_id = p_room_id and player_id = v_session.current_player_id;

  update profiles set
    total_score = total_score + case when v_correct then 10 else 0 end,
    total_xp = total_xp + case when v_correct then 10 else 0 end,
    level = greatest(1, least(5, 1 + ((total_xp + case when v_correct then 10 else 0 end) / 100)))
  where id = v_session.current_player_id;

  insert into learning_progress (player_id, kpk_correct, kpk_total)
  values (v_session.current_player_id, case when v_correct then 1 else 0 end, 1)
  on conflict (player_id) do update set
    kpk_correct = learning_progress.kpk_correct + case when v_correct then 1 else 0 end,
    kpk_total = learning_progress.kpk_total + 1,
    updated_at = now();

  update game_sessions set status = case when v_correct then 'PAWN_SELECTION' else 'TURN_END' end
  where id = v_session.id;

  return jsonb_build_object('isCorrect', v_correct, 'playerId', v_session.current_player_id,
    'scoreAwarded', case when v_correct then 10 else 0 end,
    'xpAwarded', case when v_correct then 10 else 0 end);
end;
$$;

create or replace function public.advance_game_turn(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session game_sessions;
  v_current_seat integer;
  v_next_player uuid;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found or v_session.status not in ('TURN_END', 'FEEDBACK', 'PAWN_SELECTION') then raise exception 'Giliran belum dapat dipindahkan'; end if;
  select seat_number into v_current_seat from room_players where room_id = p_room_id and player_id = v_session.current_player_id;
  select player_id into v_next_player from room_players
  where room_id = p_room_id and seat_number > v_current_seat order by seat_number limit 1;
  if v_next_player is null then
    select player_id into v_next_player from room_players where room_id = p_room_id order by seat_number limit 1;
  end if;
  update game_sessions set current_player_id = v_next_player, current_turn_number = current_turn_number + 1,
    current_dice_value = null, status = 'TURN_START' where id = v_session.id;
  return jsonb_build_object('currentPlayerId', v_next_player, 'turnNumber', v_session.current_turn_number + 1);
end;
$$;

create or replace function public.move_game_pawn(p_room_id uuid, p_pawn_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session game_sessions;
  v_pawn game_pawns;
  v_old_position integer;
  v_new_position integer;
  v_new_status text;
  v_finished boolean := false;
  v_move_result jsonb;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found or v_session.status <> 'PAWN_SELECTION' then raise exception 'Pion belum dapat digerakkan'; end if;
  select * into v_pawn from game_pawns where id = p_pawn_id and game_session_id = v_session.id for update;
  if not found or v_pawn.player_id <> v_session.current_player_id then raise exception 'Pion tidak valid'; end if;

  v_old_position := v_pawn.position;
  v_new_position := v_pawn.position;
  v_new_status := v_pawn.status;
  if v_pawn.status = 'base' then
    v_new_status := 'track'; v_new_position := 0;
  elsif v_pawn.status = 'track' then
    if v_pawn.position + v_session.current_dice_value <= 51 then
      v_new_position := v_pawn.position + v_session.current_dice_value;
    elsif v_pawn.position + v_session.current_dice_value - 52 <= 5 then
      v_new_status := 'home'; v_new_position := v_pawn.position + v_session.current_dice_value - 52;
    else raise exception 'Langkah melebihi kotak finish';
    end if;
  elsif v_pawn.status = 'home' then
    if v_pawn.position + v_session.current_dice_value > 5 then raise exception 'Langkah melebihi kotak finish'; end if;
    v_new_position := v_pawn.position + v_session.current_dice_value;
    if v_new_position = 5 then v_new_status := 'finished'; v_finished := true; end if;
  else raise exception 'Pion sudah selesai';
  end if;

  update game_pawns set status = v_new_status, position = v_new_position,
    path_index = v_new_position, is_in_base = v_new_status = 'base',
    is_in_home_track = v_new_status = 'home', is_finished = v_new_status = 'finished', updated_at = now()
  where id = p_pawn_id;
  update game_turns set selected_pawn_id = p_pawn_id, old_position = v_old_position,
    new_position = v_new_position, finished_at = now()
  where game_session_id = v_session.id and turn_number = v_session.current_turn_number;

  if v_finished then
    update room_players set score = score + 20, xp_earned = xp_earned + 20
    where room_id = p_room_id and player_id = v_session.current_player_id;
    update profiles set total_score = total_score + 20, total_xp = total_xp + 20
    where id = v_session.current_player_id;
  end if;

  update game_sessions set status = 'TURN_END' where id = v_session.id;
  v_move_result := public.advance_game_turn(p_room_id);
  return jsonb_build_object('pawnId', p_pawn_id, 'oldPosition', v_old_position,
    'newPosition', v_new_position, 'status', v_new_status, 'finished', v_finished,
    'currentPlayerId', v_move_result->>'currentPlayerId', 'turnNumber', (v_move_result->>'turnNumber')::integer);
end;
$$;

create or replace function public.save_admin_question(
  p_question_id uuid,
  p_question jsonb,
  p_options jsonb,
  p_solutions jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question questions;
begin
  if p_question_id is null then
    insert into questions (question_code,story,difficulty,topic,known_information,asked_information,strategy,
      number_a,number_b,number_c,correct_value,correct_option,final_explanation,is_active)
    values (p_question->>'question_code',p_question->>'story',p_question->>'difficulty',p_question->>'topic',
      p_question->>'known_information',p_question->>'asked_information',p_question->>'strategy',
      (p_question->>'number_a')::integer,(p_question->>'number_b')::integer,(p_question->>'number_c')::integer,
      (p_question->>'correct_value')::integer,p_question->>'correct_option',p_question->>'final_explanation',
      (p_question->>'is_active')::boolean)
    returning * into v_question;
  else
    update questions set question_code=p_question->>'question_code', story=p_question->>'story',
      difficulty=p_question->>'difficulty', topic=p_question->>'topic', known_information=p_question->>'known_information',
      asked_information=p_question->>'asked_information', strategy=p_question->>'strategy',
      number_a=(p_question->>'number_a')::integer, number_b=(p_question->>'number_b')::integer,
      number_c=(p_question->>'number_c')::integer, correct_value=(p_question->>'correct_value')::integer,
      correct_option=p_question->>'correct_option', final_explanation=p_question->>'final_explanation',
      is_active=(p_question->>'is_active')::boolean
    where id=p_question_id returning * into v_question;
    if not found then raise exception 'Soal tidak ditemukan'; end if;
    delete from question_options where question_id=p_question_id;
    delete from question_solutions where question_id=p_question_id;
  end if;

  insert into question_options (question_id,option_key,option_text,is_correct)
  select v_question.id, option_key, option_text, is_correct
  from jsonb_to_recordset(p_options) as option_row(option_key text,option_text text,is_correct boolean);
  insert into question_solutions (question_id,method,steps,result)
  select v_question.id, method, steps, result
  from jsonb_to_recordset(p_solutions) as solution_row(method text,steps jsonb,result integer);
  return to_jsonb(v_question);
end;
$$;

revoke all on function public.create_local_game(jsonb,text,text) from public, anon, authenticated;
revoke all on function public.roll_game_turn(uuid) from public, anon, authenticated;
revoke all on function public.answer_game_turn(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.advance_game_turn(uuid) from public, anon, authenticated;
revoke all on function public.move_game_pawn(uuid,uuid) from public, anon, authenticated;
revoke all on function public.save_admin_question(uuid,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_local_game(jsonb,text,text) to service_role;
grant execute on function public.roll_game_turn(uuid) to service_role;
grant execute on function public.answer_game_turn(uuid,uuid,text) to service_role;
grant execute on function public.advance_game_turn(uuid) to service_role;
grant execute on function public.move_game_pawn(uuid,uuid) to service_role;
grant execute on function public.save_admin_question(uuid,jsonb,jsonb,jsonb) to service_role;
