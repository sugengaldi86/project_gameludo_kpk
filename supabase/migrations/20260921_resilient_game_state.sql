-- Membuat mutation game mengembalikan seluruh data yang diperlukan UI dalam transaksi yang sama,
-- serta melengkapi aturan kemenangan, tangkap pion, safe zone, dan bonus angka enam.

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
  v_options jsonb;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found then raise exception 'Sesi permainan tidak ditemukan'; end if;
  if v_session.status = 'GAME_OVER' then raise exception 'Permainan sudah selesai'; end if;
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

  select coalesce(jsonb_agg(jsonb_build_object('key', option_key, 'text', option_text) order by option_key), '[]'::jsonb)
  into v_options from question_options where question_id = v_question.id;
  if jsonb_array_length(v_options) <> 4 then raise exception 'Pilihan jawaban soal tidak lengkap'; end if;

  update game_sessions set current_dice_value = v_dice, status = 'QUIZ' where id = v_session.id;
  insert into game_turns (game_session_id, turn_number, player_id, dice_value, question_id)
  values (v_session.id, v_session.current_turn_number, v_session.current_player_id, v_dice, v_question.id);

  return jsonb_build_object(
    'diceValue', v_dice,
    'playerId', v_session.current_player_id,
    'question', jsonb_build_object(
      'id', v_question.id,
      'code', v_question.question_code,
      'text', v_question.story,
      'difficulty', v_question.difficulty,
      'options', v_options
    )
  );
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
  v_solutions jsonb;
  v_next_turn jsonb := null;
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

  select coalesce(jsonb_agg(jsonb_build_object('method', method, 'steps', steps, 'result', result) order by method), '[]'::jsonb)
  into v_solutions from question_solutions where question_id = v_question.id;

  update game_turns set is_correct = v_correct where id = v_turn.id;
  insert into player_answers (
    game_session_id, turn_id, player_id, question_id, selected_option, is_correct,
    score_awarded, xp_awarded, identify_known_correct, strategy_correct, verification_correct
  ) values (
    v_session.id, v_turn.id, v_session.current_player_id, v_question.id, upper(p_selected_option), v_correct,
    case when v_correct then 10 else 0 end, case when v_correct then 10 else 0 end,
    v_correct, v_correct, v_correct
  );

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
    level = greatest(1, 1 + ((total_xp + case when v_correct then 10 else 0 end) / 100))
  where id = v_session.current_player_id;

  insert into learning_progress (
    player_id, identify_known_correct, identify_known_total, strategy_correct, strategy_total,
    kpk_correct, kpk_total, verification_correct, verification_total
  ) values (
    v_session.current_player_id, case when v_correct then 1 else 0 end, 1,
    case when v_correct then 1 else 0 end, 1, case when v_correct then 1 else 0 end, 1,
    case when v_correct then 1 else 0 end, 1
  ) on conflict (player_id) do update set
    identify_known_correct = learning_progress.identify_known_correct + case when v_correct then 1 else 0 end,
    identify_known_total = learning_progress.identify_known_total + 1,
    strategy_correct = learning_progress.strategy_correct + case when v_correct then 1 else 0 end,
    strategy_total = learning_progress.strategy_total + 1,
    kpk_correct = learning_progress.kpk_correct + case when v_correct then 1 else 0 end,
    kpk_total = learning_progress.kpk_total + 1,
    verification_correct = learning_progress.verification_correct + case when v_correct then 1 else 0 end,
    verification_total = learning_progress.verification_total + 1,
    updated_at = now();

  update game_sessions set status = case when v_correct then 'PAWN_SELECTION' else 'TURN_END' end
  where id = v_session.id;
  if not v_correct then
    update game_turns set finished_at = now() where id = v_turn.id;
    v_next_turn := public.advance_game_turn(p_room_id);
  end if;

  return jsonb_build_object(
    'isCorrect', v_correct,
    'playerId', v_session.current_player_id,
    'scoreAwarded', case when v_correct then 10 else 0 end,
    'xpAwarded', case when v_correct then 10 else 0 end,
    'correctOption', v_question.correct_option,
    'turnAdvanced', not v_correct,
    'nextTurn', v_next_turn,
    'explanation', jsonb_build_object(
      'knownInformation', v_question.known_information,
      'askedInformation', v_question.asked_information,
      'strategy', v_question.strategy,
      'finalExplanation', v_question.final_explanation,
      'solutions', v_solutions
    )
  );
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
  v_has_valid_pawn boolean;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found then raise exception 'Sesi permainan tidak ditemukan'; end if;
  if v_session.status = 'GAME_OVER' then raise exception 'Permainan sudah selesai'; end if;
  if v_session.status not in ('TURN_END', 'FEEDBACK', 'PAWN_SELECTION') then
    raise exception 'Giliran belum dapat dipindahkan';
  end if;

  if v_session.status = 'PAWN_SELECTION' then
    select exists(
      select 1 from game_pawns
      where game_session_id = v_session.id and player_id = v_session.current_player_id
        and (
          (status = 'base' and v_session.current_dice_value = 6)
          or status = 'track'
          or (status = 'home' and position + v_session.current_dice_value <= 5)
        )
    ) into v_has_valid_pawn;
    if v_has_valid_pawn then raise exception 'Masih ada pion yang dapat digerakkan'; end if;
  end if;

  select seat_number into v_current_seat from room_players
  where room_id = p_room_id and player_id = v_session.current_player_id;
  select player_id into v_next_player from room_players
  where room_id = p_room_id and seat_number > v_current_seat order by seat_number limit 1;
  if v_next_player is null then
    select player_id into v_next_player from room_players where room_id = p_room_id order by seat_number limit 1;
  end if;
  update game_sessions set current_player_id = v_next_player,
    current_turn_number = current_turn_number + 1, current_dice_value = null, status = 'TURN_START'
  where id = v_session.id;
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
  v_color text;
  v_old_position integer;
  v_new_position integer;
  v_new_status text;
  v_finished boolean := false;
  v_game_over boolean := false;
  v_global_position integer;
  v_required_finished integer;
  v_finished_count integer;
  v_move_result jsonb := null;
begin
  select * into v_session from game_sessions where room_id = p_room_id for update;
  if not found or v_session.status <> 'PAWN_SELECTION' then raise exception 'Pion belum dapat digerakkan'; end if;
  select * into v_pawn from game_pawns where id = p_pawn_id and game_session_id = v_session.id for update;
  if not found or v_pawn.player_id <> v_session.current_player_id then raise exception 'Pion tidak valid'; end if;
  select color into v_color from room_players where room_id = p_room_id and player_id = v_pawn.player_id;

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

  -- Tangkap pion lawan hanya pada jalur utama dan bukan pada delapan safe zone.
  if v_new_status = 'track' then
    v_global_position := (v_new_position + case v_color when 'blue' then 0 when 'red' then 13 when 'green' then 26 else 39 end) % 52;
    if v_global_position <> all(array[0,8,13,21,26,34,39,47]) then
      update game_pawns enemy set status = 'base', position = enemy.pawn_number - 1,
        path_index = null, is_in_base = true, is_in_home_track = false, is_finished = false, updated_at = now()
      from room_players owner
      where enemy.game_session_id = v_session.id
        and enemy.player_id = owner.player_id and owner.room_id = p_room_id
        and enemy.player_id <> v_pawn.player_id and enemy.status = 'track'
        and ((enemy.position + case owner.color when 'blue' then 0 when 'red' then 13 when 'green' then 26 else 39 end) % 52) = v_global_position;
    end if;
  end if;

  update game_turns set selected_pawn_id = p_pawn_id, old_position = v_old_position,
    new_position = v_new_position, finished_at = now()
  where game_session_id = v_session.id and turn_number = v_session.current_turn_number;

  if v_finished then
    update room_players set score = score + 20, xp_earned = xp_earned + 20
    where room_id = p_room_id and player_id = v_session.current_player_id;
    update profiles set total_score = total_score + 20, total_xp = total_xp + 20,
      level = greatest(1, 1 + ((total_xp + 20) / 100))
    where id = v_session.current_player_id;
  end if;

  select count(*) into v_required_finished from game_pawns
  where game_session_id = v_session.id and player_id = v_session.current_player_id;
  select count(*) into v_finished_count from game_pawns
  where game_session_id = v_session.id and player_id = v_session.current_player_id and status = 'finished';

  if v_required_finished > 0 and v_finished_count = v_required_finished then
    v_game_over := true;
    update game_sessions set status = 'GAME_OVER', winner_player_id = v_session.current_player_id, finished_at = now()
    where id = v_session.id;
    update rooms set status = 'finished', finished_at = now() where id = p_room_id;
  elsif v_session.current_dice_value = 6 then
    update game_sessions set status = 'TURN_START', current_turn_number = current_turn_number + 1,
      current_dice_value = null where id = v_session.id;
    v_move_result := jsonb_build_object('currentPlayerId', v_session.current_player_id,
      'turnNumber', v_session.current_turn_number + 1, 'extraTurn', true);
  else
    update game_sessions set status = 'TURN_END' where id = v_session.id;
    v_move_result := public.advance_game_turn(p_room_id);
  end if;

  return jsonb_build_object('pawnId', p_pawn_id, 'oldPosition', v_old_position,
    'newPosition', v_new_position, 'status', v_new_status, 'finished', v_finished,
    'gameOver', v_game_over, 'winnerPlayerId', case when v_game_over then v_session.current_player_id else null end,
    'currentPlayerId', coalesce(v_move_result->>'currentPlayerId', v_session.current_player_id::text),
    'turnNumber', coalesce((v_move_result->>'turnNumber')::integer, v_session.current_turn_number),
    'extraTurn', coalesce((v_move_result->>'extraTurn')::boolean, false));
end;
$$;

revoke all on function public.roll_game_turn(uuid) from public, anon, authenticated;
revoke all on function public.answer_game_turn(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.advance_game_turn(uuid) from public, anon, authenticated;
revoke all on function public.move_game_pawn(uuid,uuid) from public, anon, authenticated;
grant execute on function public.roll_game_turn(uuid) to service_role;
grant execute on function public.answer_game_turn(uuid,uuid,text) to service_role;
grant execute on function public.advance_game_turn(uuid) to service_role;
grant execute on function public.move_game_pawn(uuid,uuid) to service_role;
