-- =========================================================================================
-- Skema Database LUDO KPK - Supabase PostgreSQL
-- Berdasarkan PRD Ludo KPK Versi 1.2
-- =========================================================================================

-- Mengaktifkan UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES (Pengguna & Statistik)
-- ==========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  avatar TEXT,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. ADMINS (Autentikasi Dashboard)
-- ==========================================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- ==========================================
-- 3. ROOMS (Ruang Permainan)
-- ==========================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  host_player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  max_players INTEGER NOT NULL DEFAULT 4,
  game_mode TEXT DEFAULT 'klasik',
  status TEXT DEFAULT 'waiting', -- waiting, playing, finished, abandoned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- ==========================================
-- 4. ROOM_PLAYERS (Pemain di dalam Room)
-- ==========================================
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL, -- blue, green, yellow, red
  seat_number INTEGER NOT NULL, -- 1-4
  score INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, player_id),
  UNIQUE(room_id, seat_number),
  UNIQUE(room_id, color)
);

-- ==========================================
-- 5. GAME_SESSIONS (State Mesin Game)
-- ==========================================
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  current_player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  current_turn_number INTEGER DEFAULT 1,
  current_dice_value INTEGER,
  status TEXT DEFAULT 'TURN_START', -- TURN_START, QUIZ, PAWN_SELECTION, TURN_END, GAME_OVER, ABANDONED
  winner_player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- ==========================================
-- 6. GAME_PAWNS (Posisi Pion)
-- ==========================================
CREATE TABLE game_pawns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pawn_number INTEGER NOT NULL, -- 1-4
  status TEXT DEFAULT 'base', -- base, track, home, finished
  position INTEGER, -- indeks kotak global (0-51) atau null jika di base
  path_index INTEGER, -- indeks di jalur pulang (0-5) atau posisi di track
  is_in_base BOOLEAN DEFAULT TRUE,
  is_in_home_track BOOLEAN DEFAULT FALSE,
  is_finished BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_session_id, player_id, pawn_number)
);

-- ==========================================
-- 7. BANK SOAL (Questions & Options)
-- ==========================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_code TEXT UNIQUE NOT NULL,
  story TEXT NOT NULL,
  difficulty TEXT DEFAULT 'sedang', -- mudah, sedang, kontekstual, tiga_bilangan
  topic TEXT DEFAULT 'kpk',
  known_information TEXT,
  asked_information TEXT,
  strategy TEXT DEFAULT 'KPK',
  number_a INTEGER NOT NULL,
  number_b INTEGER NOT NULL,
  number_c INTEGER,
  correct_value INTEGER NOT NULL,
  correct_option TEXT NOT NULL, -- A, B, C, D
  final_explanation TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE question_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL, -- A, B, C, D
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  UNIQUE(question_id, option_key)
);

CREATE TABLE question_solutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- multiples, prime_factorization
  steps JSONB NOT NULL, -- langkah-langkah dalam JSON
  result INTEGER NOT NULL
);

-- ==========================================
-- 8. GAME_TURNS & PLAYER_ANSWERS (Riwayat)
-- ==========================================
CREATE TABLE game_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  dice_value INTEGER,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  selected_pawn_id UUID REFERENCES game_pawns(id) ON DELETE SET NULL,
  old_position INTEGER,
  new_position INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE player_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  turn_id UUID REFERENCES game_turns(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  selected_option TEXT,
  is_correct BOOLEAN NOT NULL,
  score_awarded INTEGER DEFAULT 0,
  xp_awarded INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 9. LEARNING PROGRESS (Evaluasi Belajar)
-- ==========================================
CREATE TABLE learning_progress (
  player_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  pretest_score NUMERIC DEFAULT 0,
  identify_known_correct INTEGER DEFAULT 0,
  identify_known_total INTEGER DEFAULT 0,
  strategy_correct INTEGER DEFAULT 0,
  strategy_total INTEGER DEFAULT 0,
  kpk_correct INTEGER DEFAULT 0,
  kpk_total INTEGER DEFAULT 0,
  verification_correct INTEGER DEFAULT 0,
  verification_total INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 10. MISSIONS & BADGES (Gamifikasi)
-- ==========================================
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 20
);

CREATE TABLE player_missions (
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (player_id, mission_id)
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL
);

CREATE TABLE player_badges (
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (player_id, badge_id)
);

-- ==========================================
-- 11. GAME EVENTS (Audit Log)
-- ==========================================
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PENGATURAN KEAMANAN (Row Level Security)
-- ==========================================
-- Karena penulisan hanya dilakukan dari Server (Service Role),
-- maka kita akan mengaktifkan RLS dan hanya memperbolehkan READ (SELECT) 
-- secara publik, sementara WRITE (INSERT/UPDATE/DELETE) harus dengan auth.

-- Aktifkan RLS untuk tabel-tabel utama
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_pawns ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Kebijakan READ (Publik / Anon)
-- Player dapat membaca status room, pemain, dan sesi.
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Rooms are viewable by everyone." ON rooms FOR SELECT USING (true);
CREATE POLICY "Room players are viewable by everyone." ON room_players FOR SELECT USING (true);
CREATE POLICY "Game sessions are viewable by everyone." ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Game pawns are viewable by everyone." ON game_pawns FOR SELECT USING (true);
CREATE POLICY "Questions are viewable by everyone." ON questions FOR SELECT USING (is_active = true);

-- Tabel admin SANGAT KETAT, tidak ada akses anon
CREATE POLICY "Admins read only by admins" ON admins FOR SELECT USING (false); -- Hanya bisa diakses service_role
