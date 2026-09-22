-- 1. Buat tabel relasi exam_questions
CREATE TABLE IF NOT EXISTS public.exam_questions (
    exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (exam_id, question_id)
);

-- Berikan hak akses
GRANT ALL ON TABLE public.exam_questions TO service_role;
GRANT ALL ON TABLE public.exam_questions TO authenticated;
GRANT ALL ON TABLE public.exam_questions TO anon;

-- 2. Perbarui fungsi roll_game_turn untuk memprioritaskan soal manual
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
  v_exam_id uuid;
  v_exam_difficulty text;
  v_has_manual_questions boolean := false;
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

    -- Ambil info ujian yang terhubung ke room ini
    SELECT e.id, e.difficulty INTO v_exam_id, v_exam_difficulty 
    FROM rooms r 
    LEFT JOIN exams e ON r.exam_id = e.id 
    WHERE r.id = p_room_id;

    -- Cek apakah ada soal yang diatur manual untuk ujian ini
    IF v_exam_id IS NOT NULL THEN
      SELECT EXISTS (SELECT 1 FROM exam_questions WHERE exam_id = v_exam_id) INTO v_has_manual_questions;
    END IF;

    IF v_has_manual_questions THEN
      -- JIKA ADA SOAL MANUAL: Ambil soal acak dari daftar spesifik yang belum dijawab
      SELECT q.* INTO v_question 
      FROM questions q
      JOIN exam_questions eq ON q.id = eq.question_id
      WHERE eq.exam_id = v_exam_id
      AND q.is_active = true
      AND q.id NOT IN (
        SELECT question_id FROM player_answers
        WHERE game_session_id = v_session.id AND player_id = v_session.current_player_id
      )
      ORDER BY random() LIMIT 1;
      
      -- Fallback manual: Jika semua sudah dijawab, ambil dari daftar manual lagi secara acak
      IF v_question IS NULL THEN
        SELECT q.* INTO v_question 
        FROM questions q
        JOIN exam_questions eq ON q.id = eq.question_id
        WHERE eq.exam_id = v_exam_id AND q.is_active = true
        ORDER BY random() LIMIT 1;
      END IF;
    ELSE
      -- JIKA TIDAK ADA SOAL MANUAL: Gunakan logika filter tingkat kesulitan (Otomatis)
      SELECT * INTO v_question FROM questions
      WHERE is_active = true
      AND (v_exam_difficulty IS NULL OR difficulty = v_exam_difficulty)
      AND id NOT IN (
        SELECT question_id FROM player_answers
        WHERE game_session_id = v_session.id AND player_id = v_session.current_player_id
      )
      ORDER BY random() LIMIT 1;

      -- Fallback level kesulitan
      IF v_question IS NULL THEN
        SELECT * INTO v_question FROM questions 
        WHERE is_active = true 
        AND (v_exam_difficulty IS NULL OR difficulty = v_exam_difficulty)
        ORDER BY random() LIMIT 1;
      END IF;
    END IF;
    
    -- Fallback terakhir darurat (Jika bank soal kosong untuk semua kriteria)
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

NOTIFY pgrst, reload_schema;