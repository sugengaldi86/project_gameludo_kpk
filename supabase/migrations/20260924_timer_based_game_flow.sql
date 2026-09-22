-- Migration: Timer Based Game Flow (Move First, Answer Later)

-- 1. Tambahkan kolom timer pada rooms
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- 2. Update create_local_game agar pawn_count selalu 1 dan set timer
-- Hapus fungsi lama agar tidak terjadi konflik (overload ambiguity)
DROP FUNCTION IF EXISTS public.create_local_game(jsonb, text, text);

CREATE OR REPLACE FUNCTION public.create_local_game(
  p_players jsonb,
  p_learning_goal text default null,
  p_game_mode text default 'klasik',
  p_duration_minutes integer default 30
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_room rooms;
  v_session game_sessions;
  v_player jsonb;
  v_profile profiles;
  v_players jsonb := '[]'::jsonb;
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_code text;
  v_index integer := 0;
  v_pawn_count integer := 1; -- SELALU 1 PION BERDASARKAN ATURAN BARU
BEGIN
  IF jsonb_typeof(p_players) <> 'array' OR jsonb_array_length(p_players) NOT BETWEEN 2 AND 4 THEN
    RAISE EXCEPTION 'Jumlah pemain harus 2 sampai 4';
  END IF;

  LOOP
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    BEGIN
      INSERT INTO rooms (room_code, max_players, game_mode, status, learning_goal, duration_minutes, end_time, started_at)
      VALUES (
        v_code, 
        jsonb_array_length(p_players), 
        p_game_mode, 
        'playing', 
        nullif(trim(p_learning_goal), ''), 
        p_duration_minutes,
        now() + (p_duration_minutes || ' minutes')::interval,
        now()
      )
      RETURNING * INTO v_room;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Retry
    END;
  END LOOP;

  FOR v_player IN SELECT value FROM jsonb_array_elements(p_players)
  LOOP
    IF length(trim(coalesce(v_player->>'name', ''))) NOT BETWEEN 1 AND 40 THEN
      RAISE EXCEPTION 'Nama pemain wajib diisi (maksimal 40 karakter)';
    END IF;
    IF coalesce(v_player->>'color', '') NOT IN ('blue', 'green', 'yellow', 'red') THEN
      RAISE EXCEPTION 'Warna pemain tidak valid';
    END IF;

    INSERT INTO profiles (name, avatar)
    VALUES (trim(v_player->>'name'), left(coalesce(v_player->>'avatar', v_player->>'name'), 1))
    RETURNING * INTO v_profile;

    INSERT INTO room_players (room_id, player_id, display_name, color, seat_number, is_ready, is_online)
    VALUES (v_room.id, v_profile.id, v_profile.name, v_player->>'color', v_index + 1, true, true);

    v_players := v_players || jsonb_build_array(jsonb_build_object(
      'id', v_profile.id, 'name', v_profile.name, 'avatar', v_profile.avatar,
      'color', v_player->>'color', 'token', encode(gen_random_bytes(32), 'hex')
    ));

    IF v_index = 0 THEN
      UPDATE rooms SET host_player_id = v_profile.id WHERE id = v_room.id;
    END IF;
    v_index := v_index + 1;
  END LOOP;

  INSERT INTO game_sessions (room_id, current_player_id, current_turn_number, status, started_at)
  VALUES (v_room.id, (v_players->0->>'id')::uuid, 1, 'TURN_START', now())
  RETURNING * INTO v_session;

  INSERT INTO game_pawns (game_session_id, player_id, pawn_number, status, position, path_index, is_in_base, is_in_home_track, is_finished)
  SELECT v_session.id, (player->>'id')::uuid, pawn_number, 'base', pawn_number - 1, null, true, false, false
  FROM jsonb_array_elements(v_players) player
  CROSS JOIN generate_series(1, v_pawn_count) pawn_number;

  INSERT INTO learning_progress (player_id)
  SELECT (player->>'id')::uuid FROM jsonb_array_elements(v_players) player
  ON CONFLICT (player_id) DO NOTHING;

  INSERT INTO guest_room_sessions (room_id, token_hash)
  VALUES (v_room.id, encode(digest(v_token, 'sha256'), 'hex'));

  RETURN jsonb_build_object(
    'roomCode', v_code,
    'roomId', v_room.id,
    'sessionId', v_session.id,
    'accessToken', v_token,
    'players', v_players
  );
END;
$$;

-- 3. Update roll_game_turn: Lempar dadu, lalu SELALU tampilkan soal
DROP FUNCTION IF EXISTS public.roll_game_turn(uuid, integer);

CREATE OR REPLACE FUNCTION public.roll_game_turn(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session game_sessions;
  v_has_valid_pawn boolean := false;
  v_dice_value integer;
  v_question questions;
  v_turn_id uuid;
BEGIN
  v_dice_value := floor(random() * 6 + 1)::int;
  
  SELECT * INTO v_session FROM game_sessions WHERE room_id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_session.status <> 'TURN_START' THEN 
    RAISE EXCEPTION 'Giliran melempar dadu sudah berlalu'; 
  END IF;
  IF v_dice_value NOT BETWEEN 1 AND 6 THEN 
    RAISE EXCEPTION 'Nilai dadu tidak valid'; 
  END IF;
  
  -- Cek jika game sudah lewat waktunya
  IF EXISTS (SELECT 1 FROM rooms WHERE id = p_room_id AND end_time <= now()) THEN
    RAISE EXCEPTION 'Waktu permainan telah habis';
  END IF;

  UPDATE game_sessions SET current_dice_value = v_dice_value WHERE id = v_session.id;

  -- Cek apakah ada pion yang BISA jalan
  SELECT EXISTS (
    SELECT 1 FROM game_pawns 
    WHERE game_session_id = v_session.id AND player_id = v_session.current_player_id AND status <> 'finished'
    AND (
      (status = 'base' AND v_dice_value = 6) OR
      status = 'track' OR
      (status = 'home' AND position + v_dice_value <= 5)
    )
  ) INTO v_has_valid_pawn;

  IF v_has_valid_pawn THEN
    -- Pion bisa jalan: tunggu pemain klik pion dulu sebelum soal
    UPDATE game_sessions SET status = 'PAWN_SELECTION' WHERE id = v_session.id;
    RETURN jsonb_build_object('diceValue', v_dice_value, 'canMovePawn', true, 'nextStatus', 'PAWN_SELECTION');
  ELSE
    -- Pion TIDAK bisa jalan (bukan angka 6 atau semua sudah finish):
    -- TETAP tampilkan soal! Setelah menjawab baru ganti giliran.
    UPDATE game_sessions SET status = 'QUIZ' WHERE id = v_session.id;

    -- Ambil soal acak yang belum pernah dijawab pemain ini di sesi ini
    SELECT * INTO v_question FROM questions
    WHERE is_active = true
    AND id NOT IN (
      SELECT question_id FROM player_answers
      WHERE game_session_id = v_session.id AND player_id = v_session.current_player_id
    )
    ORDER BY random() LIMIT 1;

    -- Jika semua soal sudah dijawab, ambil soal acak dari semua soal
    IF v_question IS NULL THEN
      SELECT * INTO v_question FROM questions WHERE is_active = true ORDER BY random() LIMIT 1;
    END IF;

    -- Buat record giliran tanpa pergerakan pion
    INSERT INTO game_turns (game_session_id, turn_number, player_id, question_id, dice_value, old_position, new_position)
    VALUES (v_session.id, v_session.current_turn_number, v_session.current_player_id, v_question.id, v_dice_value, null, null)
    RETURNING id INTO v_turn_id;

    RETURN jsonb_build_object(
      'diceValue', v_dice_value, 
      'canMovePawn', false, 
      'nextStatus', 'QUIZ',
      'question', jsonb_build_object(
        'id', v_question.id,
        'code', v_question.question_code,
        'content', v_question.story,
        'options', (
          SELECT jsonb_agg(jsonb_build_object('key', option_key, 'text', option_text) ORDER BY option_key)
          FROM question_options WHERE question_id = v_question.id
        )
      )
    );
  END IF;
END;
$$;


-- 4. Update move_game_pawn: Cek pergerakan pion, setelah jalan, assign soal dan pindah ke QUIZ
CREATE OR REPLACE FUNCTION public.move_game_pawn(p_room_id uuid, p_pawn_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session game_sessions;
  v_pawn game_pawns;
  v_old_position integer;
  v_new_position integer;
  v_new_status text;
  v_finished boolean := false;
  v_move_result jsonb;
  v_color text;
  v_captured_count integer := 0;
  v_global_position integer;
  v_question questions;
  v_turn_id uuid;
BEGIN
  SELECT * INTO v_session FROM game_sessions WHERE room_id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_session.status <> 'PAWN_SELECTION' THEN RAISE EXCEPTION 'Pion belum dapat digerakkan'; END IF;
  IF v_session.current_dice_value NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'Nilai dadu tidak valid'; END IF;

  SELECT * INTO v_pawn FROM game_pawns WHERE id = p_pawn_id AND game_session_id = v_session.id FOR UPDATE;
  IF NOT FOUND OR v_pawn.player_id <> v_session.current_player_id THEN RAISE EXCEPTION 'Pion tidak valid'; END IF;
  BEGIN SELECT color INTO v_color FROM room_players WHERE room_id = p_room_id AND player_id = v_pawn.player_id; EXCEPTION WHEN OTHERS THEN v_color := 'blue'; END;

  v_old_position := v_pawn.position;
  v_new_position := v_pawn.position;
  v_new_status := v_pawn.status;
  
  IF v_pawn.status = 'base' THEN
    IF v_session.current_dice_value <> 6 THEN RAISE EXCEPTION 'Pion di base hanya dapat keluar dengan angka 6'; END IF;
    v_new_status := 'track';
    v_new_position := 0;
  ELSIF v_pawn.status = 'track' THEN
    IF v_pawn.position + v_session.current_dice_value <= 51 THEN
      v_new_position := v_pawn.position + v_session.current_dice_value;
    ELSIF v_pawn.position + v_session.current_dice_value - 52 <= 5 THEN
      v_new_position := v_pawn.position + v_session.current_dice_value - 52;
      IF v_new_position = 5 THEN
        v_new_status := 'finished';
        v_finished := true;
      ELSE
        v_new_status := 'home';
      END IF;
    ELSE
      RAISE EXCEPTION 'Langkah melebihi kotak finish';
    END IF;
  ELSIF v_pawn.status = 'home' THEN
    IF v_pawn.position + v_session.current_dice_value > 5 THEN
      RAISE EXCEPTION 'Pion harus berhenti tepat di kotak finish';
    END IF;
    v_new_position := v_pawn.position + v_session.current_dice_value;
    IF v_new_position = 5 THEN
      v_new_status := 'finished';
      v_finished := true;
    END IF;
  ELSE
    RAISE EXCEPTION 'Pion sudah selesai';
  END IF;

  UPDATE game_pawns SET status = v_new_status, position = v_new_position,
    path_index = v_new_position, is_in_base = v_new_status = 'base',
    is_in_home_track = v_new_status = 'home', is_finished = v_new_status = 'finished', updated_at = now()
  WHERE id = p_pawn_id;

  -- Tangkap pion lawan jika di track
  IF v_new_status = 'track' THEN
    v_global_position := (v_new_position + CASE v_color WHEN 'blue' THEN 0 WHEN 'red' THEN 13 WHEN 'green' THEN 26 ELSE 39 END) % 52;
    IF v_global_position <> ALL(ARRAY[0,8,13,21,26,34,39,47]) THEN
      UPDATE game_pawns enemy SET status = 'base', position = enemy.pawn_number - 1,
        path_index = NULL, is_in_base = true, is_in_home_track = false, is_finished = false, updated_at = now()
      FROM room_players owner
      WHERE enemy.game_session_id = v_session.id
        AND enemy.player_id = owner.player_id AND owner.room_id = p_room_id
        AND enemy.player_id <> v_pawn.player_id AND enemy.status = 'track'
        AND ((enemy.position + CASE owner.color WHEN 'blue' THEN 0 WHEN 'red' THEN 13 WHEN 'green' THEN 26 ELSE 39 END) % 52) = v_global_position;
      GET DIAGNOSTICS v_captured_count = ROW_COUNT;
    END IF;
  END IF;

  -- Set status ke QUIZ karena pemain berhenti di petak soal
  UPDATE game_sessions SET status = 'QUIZ' WHERE id = v_session.id;

  -- Assign soal baru secara acak
  SELECT * INTO v_question FROM questions
  WHERE is_active = true
  AND id NOT IN (
    SELECT question_id FROM player_answers
    WHERE game_session_id = v_session.id AND player_id = v_session.current_player_id
  )
  ORDER BY random() LIMIT 1;

  IF v_question IS NULL THEN
    SELECT * INTO v_question FROM questions WHERE is_active = true ORDER BY random() LIMIT 1;
  END IF;

  -- Buat record giliran (game_turns)
  INSERT INTO game_turns (game_session_id, turn_number, player_id, question_id, dice_value, selected_pawn_id, old_position, new_position)
  VALUES (v_session.id, v_session.current_turn_number, v_session.current_player_id, v_question.id, v_session.current_dice_value, p_pawn_id, v_old_position, v_new_position)
  RETURNING id INTO v_turn_id;

  RETURN jsonb_build_object(
    'pawnId', p_pawn_id, 'oldPosition', v_old_position, 'newPosition', v_new_position, 
    'status', v_new_status, 'finished', v_finished, 'capturedCount', v_captured_count, 
    'nextStatus', 'QUIZ', 'question', jsonb_build_object(
      'id', v_question.id,
      'code', v_question.question_code,
      'content', v_question.story,
      'options', (
        SELECT jsonb_agg(jsonb_build_object('key', option_key, 'text', option_text) ORDER BY option_key)
        FROM question_options WHERE question_id = v_question.id
      )
    )
  );
END;
$$;

-- 5. Update answer_game_turn: Setelah menjawab, langsung TURN_END dan selesai. (Jika benar tambah poin, jika salah tidak dapat poin)
CREATE OR REPLACE FUNCTION public.answer_game_turn(
  p_room_id uuid,
  p_question_id uuid,
  p_selected_option text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session game_sessions;
  v_turn game_turns;
  v_question questions;
  v_correct boolean;
  v_solutions jsonb;
  v_next_turn jsonb := null;
  v_points integer := 10;
BEGIN
  SELECT * INTO v_session FROM game_sessions WHERE room_id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_session.status <> 'QUIZ' THEN RAISE EXCEPTION 'State permainan tidak valid'; END IF;

  SELECT * INTO v_turn FROM game_turns
  WHERE game_session_id = v_session.id AND turn_number = v_session.current_turn_number
  FOR UPDATE;
  IF NOT FOUND OR v_turn.question_id <> p_question_id THEN RAISE EXCEPTION 'Soal bukan milik giliran aktif'; END IF;

  SELECT * INTO v_question FROM questions WHERE id = p_question_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Soal tidak ditemukan'; END IF;
  
  v_correct := upper(p_selected_option) = v_question.correct_option;

  SELECT coalesce(jsonb_agg(jsonb_build_object('method', method, 'steps', steps, 'result', result) ORDER BY method), '[]'::jsonb)
  INTO v_solutions FROM question_solutions WHERE question_id = v_question.id;

  UPDATE game_turns SET is_correct = v_correct, finished_at = now() WHERE id = v_turn.id;
  
  INSERT INTO player_answers (
    game_session_id, turn_id, player_id, question_id, selected_option, is_correct,
    score_awarded, xp_awarded, identify_known_correct, strategy_correct, verification_correct
  ) VALUES (
    v_session.id, v_turn.id, v_session.current_player_id, v_question.id, upper(p_selected_option), v_correct,
    CASE WHEN v_correct THEN v_points ELSE 0 END, CASE WHEN v_correct THEN v_points ELSE 0 END,
    v_correct, v_correct, v_correct
  );

  IF v_correct THEN
    UPDATE room_players SET
      score = score + v_points, xp_earned = xp_earned + v_points,
      correct_answers = correct_answers + 1, streak = streak + 1
    WHERE room_id = p_room_id AND player_id = v_session.current_player_id;

    UPDATE profiles SET
      total_score = total_score + v_points, total_xp = total_xp + v_points,
      level = greatest(1, 1 + ((total_xp + v_points) / 100))
    WHERE id = v_session.current_player_id;
  ELSE
    UPDATE room_players SET
      wrong_answers = wrong_answers + 1, streak = 0
    WHERE room_id = p_room_id AND player_id = v_session.current_player_id;
  END IF;

  -- APA PUN HASILNYA, LANGSUNG TURN END
  UPDATE game_sessions SET status = 'TURN_END' WHERE id = v_session.id;
  v_next_turn := public.advance_game_turn(p_room_id);

  RETURN jsonb_build_object(
    'isCorrect', v_correct,
    'playerId', v_session.current_player_id,
    'scoreAwarded', CASE WHEN v_correct THEN v_points ELSE 0 END,
    'xpAwarded', CASE WHEN v_correct THEN v_points ELSE 0 END,
    'correctOption', v_question.correct_option,
    'turnAdvanced', true,
    'nextTurn', v_next_turn,
    'explanation', jsonb_build_object(
      'knownInformation', v_question.known_information,
      'askedInformation', v_question.asked_information,
      'strategy', v_question.strategy,
      'finalExplanation', v_question.final_explanation,
      'solutions', v_solutions
    )
  );
END;
$$;
