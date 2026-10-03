-- ====================================================================
-- SEED DATA LENGKAP: 15 SOAL KPK BERBASIS TAHAPAN POLYA
-- 10 Pilihan Ganda (PG01 - PG10) & 5 Esai (ES01 - ES05)
-- Menyertakan 3 Metode Penyelesaian (Kelipatan, Pohon Faktor, Sengkedan)
-- ====================================================================

-- Perbarui constraint method agar menerima 'repeated_division' (sengkedan)
ALTER TABLE public.question_solutions
  DROP CONSTRAINT IF EXISTS question_solutions_method_check;

ALTER TABLE public.question_solutions
  ADD CONSTRAINT question_solutions_method_check
  CHECK (method IN ('multiples', 'prime_factorization', 'repeated_division'));

DO $$
DECLARE
  q_id uuid;
BEGIN
  -- -------------------------------------------------------------------
  -- 1. PG01 (Mudah) - Menabung dua sahabat
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG01',
    'Dua sahabat menabung di celengan. Rendi menabung setiap 3 hari sekali, dan Fajar menabung setiap 5 hari sekali. Hari ini mereka menabung bersamaan. Berapa hari lagi mereka akan menabung bersamaan lagi?',
    'multiple_choice', 'mudah', 3, 5, 2, 15, 'B',
    'Rendi menabung setiap 3 hari sekali; Fajar menabung setiap 5 hari sekali; hari ini keduanya menabung bersamaan.',
    'Berapa hari lagi mereka akan menabung bersamaan lagi?',
    'Mencari KPK dari 3 dan 5, karena hari mereka menabung bersama lagi adalah kelipatan persekutuan terkecil kedua bilangan.',
    '15 habis dibagi 3 (=5 kali) dan habis dibagi 5 (=3 kali), dan tidak ada bilangan lebih kecil yang memenuhi keduanya. Kesimpulan: KPK dari 3 dan 5 adalah 15. Jawaban: (B)',
    10, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '10 hari', false),
    (q_id, 'B', '15 hari', true),
    (q_id, 'C', '20 hari', false),
    (q_id, 'D', '30 hari', false);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 3: 3, 6, 9, 12, 15", "Kelipatan 5: 5, 10, 15", "Kelipatan persekutuan terkecil (KPK) = 15"]'::jsonb, 15),
    (q_id, 'prime_factorization', '["Faktorisasi prima 3 = 3", "Faktorisasi prima 5 = 5", "KPK = ambil semua faktor prima pangkat tertinggi = 3 × 5 = 15"]'::jsonb, 15),
    (q_id, 'repeated_division', '["Bagi 3 dan 5 dengan 3: menghasilkan 1 dan 5", "Bagi dengan 5: menghasilkan 1 dan 1", "KPK = hasil kali semua pembagi = 3 × 5 = 15"]'::jsonb, 15);

  -- -------------------------------------------------------------------
  -- 2. PG02 (Mudah) - Jadwal dua bus kota
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG02',
    'Bus Trans A berangkat dari halte setiap 4 menit sekali, sedangkan Bus Trans B berangkat setiap 7 menit sekali. Keduanya berangkat bersamaan pukul 06.00. Pukul berapa keduanya akan berangkat bersamaan lagi?',
    'multiple_choice', 'mudah', 4, 7, 2, 28, 'B',
    'Bus A berangkat tiap 4 menit; Bus B berangkat tiap 7 menit; keduanya berangkat bersama pukul 06.00.',
    'Pukul berapa keduanya akan berangkat bersamaan lagi?',
    'Mencari KPK dari 4 dan 7 untuk mengetahui selisih menit sampai keduanya berangkat bersamaan lagi, lalu menambahkannya ke pukul 06.00.',
    '28 menit setelah pukul 06.00 adalah pukul 06.28; 28 habis dibagi 4 (=7 kali) dan 7 (=4 kali). Kesimpulan: KPK dari 4 dan 7 adalah 28. Jawaban: (B)',
    20, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '06.21', false),
    (q_id, 'B', '06.28', true),
    (q_id, 'C', '06.35', false),
    (q_id, 'D', '07.00', false);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 4: 4, 8, 12, 16, 20, 24, 28", "Kelipatan 7: 7, 14, 21, 28", "Kelipatan persekutuan terkecil (KPK) = 28"]'::jsonb, 28),
    (q_id, 'prime_factorization', '["4 = 2 × 2 = 2²", "Faktorisasi prima 7 = 7", "KPK = 2² × 7 = 4 × 7 = 28"]'::jsonb, 28),
    (q_id, 'repeated_division', '["Bagi 4 dan 7 dengan 2: 2 dan 7", "Bagi dengan 2: 1 dan 7", "Bagi dengan 7: 1 dan 1", "KPK = 2 × 2 × 7 = 28"]'::jsonb, 28);

  -- -------------------------------------------------------------------
  -- 3. PG03 (Mudah) - Kunjungan perpustakaan & renang
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG03',
    'Siti pergi ke perpustakaan setiap 6 hari sekali dan berenang setiap 10 hari sekali. Hari ini ia melakukan keduanya secara bersamaan. Setelah berapa hari lagi Siti akan melakukan keduanya bersamaan lagi?',
    'multiple_choice', 'mudah', 6, 10, 2, 30, 'C',
    'Siti ke perpustakaan tiap 6 hari; berenang tiap 10 hari; hari ini keduanya dilakukan bersamaan.',
    'Setelah berapa hari lagi Siti akan melakukan keduanya bersamaan lagi?',
    'Mencari KPK dari 6 dan 10, karena hari kedua kegiatan bertemu lagi adalah kelipatan persekutuan terkecilnya.',
    '30 habis dibagi 6 (=5 kali) dan 10 (=3 kali). Kesimpulan: KPK dari 6 dan 10 adalah 30. Jawaban: (C)',
    30, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '16 hari', false),
    (q_id, 'B', '20 hari', false),
    (q_id, 'C', '30 hari', true),
    (q_id, 'D', '60 hari', false);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 6: 6, 12, 18, 24, 30", "Kelipatan 10: 10, 20, 30", "Kelipatan persekutuan terkecil (KPK) = 30"]'::jsonb, 30),
    (q_id, 'prime_factorization', '["6 = 2 × 3", "10 = 2 × 5", "KPK = 2 × 3 × 5 = 30"]'::jsonb, 30),
    (q_id, 'repeated_division', '["Bagi 6 dan 10 dengan 2: 3 dan 5", "Bagi dengan 3: 1 dan 5", "Bagi dengan 5: 1 dan 1", "KPK = 2 × 3 × 5 = 30"]'::jsonb, 30);

  -- -------------------------------------------------------------------
  -- 4. PG04 (Mudah) - Jadwal piket dua kelas
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG04',
    'Kelas 5A piket setiap 9 hari sekali dan Kelas 5B piket setiap 12 hari sekali di ruang perpustakaan sekolah. Hari ini keduanya piket bersamaan. Setelah berapa hari kedua kelas akan piket bersamaan lagi?',
    'multiple_choice', 'mudah', 9, 12, 2, 36, 'D',
    'Kelas 5A piket tiap 9 hari; Kelas 5B piket tiap 12 hari; hari ini keduanya piket bersamaan.',
    'Setelah berapa hari kedua kelas akan piket bersamaan lagi?',
    'Mencari KPK dari 9 dan 12 menggunakan faktorisasi prima atau kelipatan.',
    '36 habis dibagi 9 (=4 kali) dan 12 (=3 kali). Kesimpulan: KPK dari 9 dan 12 adalah 36. Jawaban: (D)',
    40, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '21 hari', false),
    (q_id, 'B', '24 hari', false),
    (q_id, 'C', '48 hari', false),
    (q_id, 'D', '36 hari', true);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 9: 9, 18, 27, 36", "Kelipatan 12: 12, 24, 36", "Kelipatan persekutuan terkecil (KPK) = 36"]'::jsonb, 36),
    (q_id, 'prime_factorization', '["9 = 3²", "12 = 2² × 3", "KPK = 2² × 3² = 4 × 9 = 36"]'::jsonb, 36),
    (q_id, 'repeated_division', '["Bagi 9 dan 12 dengan 2: 9 dan 6", "Bagi dengan 2: 9 dan 3", "Bagi dengan 3: 3 dan 1", "Bagi dengan 3: 1 dan 1", "KPK = 2 × 2 × 3 × 3 = 36"]'::jsonb, 36);

  -- -------------------------------------------------------------------
  -- 5. PG05 (Sedang) - Lampu hias berkedip
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG05',
    'Lampu hias merah berkedip setiap 10 detik sekali, sedangkan lampu hias kuning berkedip setiap 15 detik sekali. Keduanya menyala bersamaan pada detik ke-0. Pada detik keberapa kedua lampu akan berkedip bersamaan lagi?',
    'multiple_choice', 'sedang', 10, 15, 2, 30, 'C',
    'Lampu merah berkedip tiap 10 detik; lampu kuning tiap 15 detik; keduanya bersamaan pada detik ke-0.',
    'Pada detik keberapa kedua lampu akan berkedip bersamaan lagi?',
    'Mencari KPK dari 10 dan 15 untuk menentukan detik saat keduanya berkedip bersamaan lagi.',
    '30 habis dibagi 10 (=3 kali) dan 15 (=2 kali). Kesimpulan: KPK dari 10 dan 15 adalah 30. Jawaban: (C)',
    50, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '45 detik', false),
    (q_id, 'B', '25 detik', false),
    (q_id, 'C', '30 detik', true),
    (q_id, 'D', '20 detik', false);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 10: 10, 20, 30", "Kelipatan 15: 15, 30", "Kelipatan persekutuan terkecil (KPK) = 30"]'::jsonb, 30),
    (q_id, 'prime_factorization', '["10 = 2 × 5", "15 = 3 × 5", "KPK = 2 × 3 × 5 = 30"]'::jsonb, 30),
    (q_id, 'repeated_division', '["Bagi 10 dan 15 dengan 2: 5 dan 15", "Bagi dengan 3: 5 dan 5", "Bagi dengan 5: 1 dan 1", "KPK = 2 × 3 × 5 = 30"]'::jsonb, 30);

  -- -------------------------------------------------------------------
  -- 6. PG06 (Sedang) - Jadwal pengambilan sampah dua RT
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG06',
    'Petugas kebersihan RT 01 mengambil sampah setiap 14 hari sekali, sedangkan RT 02 setiap 21 hari sekali. Hari ini keduanya mengambil sampah bersamaan. Setelah berapa hari lagi kedua RT mengambil sampah bersamaan?',
    'multiple_choice', 'sedang', 14, 21, 2, 42, 'B',
    'RT 01 mengambil sampah tiap 14 hari; RT 02 tiap 21 hari; hari ini keduanya bersamaan.',
    'Setelah berapa hari lagi kedua RT mengambil sampah bersamaan?',
    'Mencari KPK dari 14 dan 21 menggunakan faktorisasi prima atau sengkedan.',
    '42 habis dibagi 14 (=3 kali) dan 21 (=2 kali). Kesimpulan: KPK dari 14 dan 21 adalah 42. Jawaban: (B)',
    60, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '35 hari', false),
    (q_id, 'B', '42 hari', true),
    (q_id, 'C', '49 hari', false),
    (q_id, 'D', '63 hari', false);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 14: 14, 28, 42", "Kelipatan 21: 21, 42", "Kelipatan persekutuan terkecil (KPK) = 42"]'::jsonb, 42),
    (q_id, 'prime_factorization', '["14 = 2 × 7", "21 = 3 × 7", "KPK = 2 × 3 × 7 = 42"]'::jsonb, 42),
    (q_id, 'repeated_division', '["Bagi 14 dan 21 dengan 2: 7 dan 21", "Bagi dengan 3: 7 dan 7", "Bagi dengan 7: 1 dan 1", "KPK = 2 × 3 × 7 = 42"]'::jsonb, 42);

  -- -------------------------------------------------------------------
  -- 7. PG07 (Sedang) - Dua mesin pabrik selesai produksi
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG07',
    'Mesin pabrik I menyelesaikan satu batch produksi setiap 8 jam, sedangkan mesin pabrik II setiap 20 jam. Keduanya menyelesaikan batch pertama bersamaan pada jam ke-0. Pada jam keberapa kedua mesin akan menyelesaikan batch secara bersamaan lagi?',
    'multiple_choice', 'sedang', 8, 20, 2, 40, 'D',
    'Mesin I selesai tiap 8 jam; mesin II selesai tiap 20 jam; keduanya bersamaan pada jam ke-0.',
    'Pada jam keberapa kedua mesin akan menyelesaikan batch secara bersamaan lagi?',
    'Mencari KPK dari 8 dan 20 untuk menentukan jam saat kedua mesin selesai bersamaan lagi.',
    '40 habis dibagi 8 (=5 kali) dan 20 (=2 kali). Kesimpulan: KPK dari 8 dan 20 adalah 40. Jawaban: (D)',
    70, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '28 jam', false),
    (q_id, 'B', '30 jam', false),
    (q_id, 'C', '38 jam', false),
    (q_id, 'D', '40 jam', true);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 8: 8, 16, 24, 32, 40", "Kelipatan 20: 20, 40", "Kelipatan persekutuan terkecil (KPK) = 40"]'::jsonb, 40),
    (q_id, 'prime_factorization', '["8 = 2³", "20 = 2² × 5", "KPK = 2³ × 5 = 8 × 5 = 40"]'::jsonb, 40),
    (q_id, 'repeated_division', '["Bagi 8 dan 20 dengan 2: 4 dan 10", "Bagi dengan 2: 2 dan 5", "Bagi dengan 2: 1 dan 5", "Bagi dengan 5: 1 dan 1", "KPK = 2 × 2 × 2 × 5 = 40"]'::jsonb, 40);

  -- -------------------------------------------------------------------
  -- 8. PG08 (HOTS) - Tiga alarm berbunyi
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG08',
    'Tiga alarm di rumah Dito berbunyi otomatis: alarm dapur setiap 6 menit, alarm kamar setiap 8 menit, dan alarm garasi setiap 12 menit. Ketiganya berbunyi bersamaan pukul 05.00. Pukul berapa ketiga alarm akan berbunyi bersamaan lagi?',
    'multiple_choice', 'hots', 6, 8, 12, 3, 24, 'C',
    'Alarm dapur tiap 6 menit, alarm kamar tiap 8 menit, alarm garasi tiap 12 menit; ketiganya bersama pukul 05.00.',
    'Pukul berapa ketiga alarm akan berbunyi bersamaan lagi?',
    'Mencari KPK dari tiga bilangan (6, 8, dan 12) sekaligus, karena kejadian bersamaan melibatkan tiga jadwal.',
    '24 habis dibagi 6 (=4 kali), 8 (=3 kali), dan 12 (=2 kali); 05.00 + 24 menit = 05.24. Kesimpulan: KPK dari 6, 8, dan 12 adalah 24. Jawaban: (C)',
    80, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, number_c = EXCLUDED.number_c, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '05.16', false),
    (q_id, 'B', '05.20', false),
    (q_id, 'C', '05.24', true),
    (q_id, 'D', '05.30', false);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 6: 6, 12, 18, 24", "Kelipatan 8: 8, 16, 24", "Kelipatan 12: 12, 24", "Kelipatan persekutuan terkecil (KPK) = 24"]'::jsonb, 24),
    (q_id, 'prime_factorization', '["6 = 2 × 3", "8 = 2³", "12 = 2² × 3", "KPK = 2³ × 3 = 8 × 3 = 24"]'::jsonb, 24),
    (q_id, 'repeated_division', '["Bagi 6, 8, 12 dengan 2: 3, 4, 6", "Bagi dengan 2: 3, 2, 3", "Bagi dengan 2: 3, 1, 3", "Bagi dengan 3: 1, 1, 1", "KPK = 2 × 2 × 2 × 3 = 24"]'::jsonb, 24);

  -- -------------------------------------------------------------------
  -- 9. PG09 (HOTS) - Tiga petugas ronda
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG09',
    'Tiga petugas ronda bergiliran jaga malam: petugas 1 setiap 10 hari, petugas 2 setiap 15 hari, dan petugas 3 setiap 25 hari. Ketiganya bertugas bersama pada 1 Januari. Setelah berapa hari ketiganya akan bertugas bersama lagi?',
    'multiple_choice', 'hots', 10, 15, 25, 3, 150, 'D',
    'Petugas 1 tiap 10 hari, petugas 2 tiap 15 hari, petugas 3 tiap 25 hari; ketiganya bersama pada 1 Januari.',
    'Setelah berapa hari ketiganya akan bertugas bersama lagi?',
    'Mencari KPK dari tiga bilangan (10, 15, dan 25) menggunakan faktorisasi prima.',
    '150 habis dibagi 10 (=15 kali), 15 (=10 kali), dan 25 (=6 kali). Kesimpulan: KPK dari 10, 15, dan 25 adalah 150. Jawaban: (D)',
    90, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, number_c = EXCLUDED.number_c, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '50 hari', false),
    (q_id, 'B', '75 hari', false),
    (q_id, 'C', '100 hari', false),
    (q_id, 'D', '150 hari', true);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 10: 10, 20, 30, 40, ..., 150", "Kelipatan 15: 15, 30, 45, ..., 150", "Kelipatan 25: 25, 50, 75, 100, 125, 150", "Kelipatan persekutuan terkecil (KPK) = 150"]'::jsonb, 150),
    (q_id, 'prime_factorization', '["10 = 2 × 5", "15 = 3 × 5", "25 = 5²", "KPK = 2 × 3 × 5² = 6 × 25 = 150"]'::jsonb, 150),
    (q_id, 'repeated_division', '["Bagi 10, 15, 25 dengan 2: 5, 15, 25", "Bagi dengan 3: 5, 5, 25", "Bagi dengan 5: 1, 1, 5", "Bagi dengan 5: 1, 1, 1", "KPK = 2 × 3 × 5 × 5 = 150"]'::jsonb, 150);

  -- -------------------------------------------------------------------
  -- 10. PG10 (HOTS) - Keberangkatan dua kereta dalam jam operasional
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation, display_order, is_active
  ) VALUES (
    'PG10',
    'Di sebuah stasiun, kereta jurusan A berangkat setiap 18 menit sekali dan kereta jurusan B setiap 24 menit sekali. Jam operasional stasiun berlangsung 6 jam (360 menit), dimulai saat kedua kereta berangkat bersamaan pada menit ke-0. Berapa kali total kedua kereta berangkat bersamaan selama 360 menit tersebut (termasuk keberangkatan pertama pada menit ke-0)?',
    'multiple_choice', 'hots', 18, 24, 2, 72, 'C',
    'Kereta A berangkat tiap 18 menit; kereta B tiap 24 menit; jam operasional 360 menit, dimulai bersamaan pada menit ke-0.',
    'Berapa kali total kedua kereta berangkat bersamaan selama 360 menit tersebut (termasuk keberangkatan pertama pada menit ke-0)?',
    'Mencari KPK dari 18 dan 24 untuk mengetahui jarak antarkeberangkatan bersama, lalu membagi total waktu operasional (360 menit) dengan KPK tersebut untuk mengevaluasi berapa kali kejadian itu berulang.',
    'KPK dari 18 dan 24 adalah 72 menit. Keberangkatan bersama terjadi pada menit ke-0, 72, 144, 216, 288, dan 360 — seluruhnya masih dalam rentang 360 menit, sehingga total ada 6 kali. Kesimpulan: KPK dari 18 dan 24 adalah 72. Jawaban: (C)',
    100, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '4 kali', false),
    (q_id, 'B', '5 kali', false),
    (q_id, 'C', '6 kali', true),
    (q_id, 'D', '8 kali', false);

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 18: 18, 36, 54, 72", "Kelipatan 24: 24, 48, 72", "Kelipatan persekutuan terkecil (KPK) = 72"]'::jsonb, 72),
    (q_id, 'prime_factorization', '["18 = 2 × 3²", "24 = 2³ × 3", "KPK = 2³ × 3² = 8 × 9 = 72"]'::jsonb, 72),
    (q_id, 'repeated_division', '["Bagi 18 dan 24 dengan 2: 9 dan 12", "Bagi dengan 2: 9 dan 6", "Bagi dengan 2: 9 dan 3", "Bagi dengan 3: 3 dan 1", "Bagi dengan 3: 1 dan 1", "KPK = 2 × 2 × 2 × 3 × 3 = 72"]'::jsonb, 72);


  -- -------------------------------------------------------------------
  -- 11. ES01 (Mudah) - Restock dagangan dua pedagang
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation,
    answer_know, answer_asked, answer_plan, answer_solution, answer_check, score_weight, display_order, is_active
  ) VALUES (
    'ES01',
    'Pedagang A me-restock dagangannya setiap 4 hari sekali, sedangkan Pedagang B me-restock setiap 6 hari sekali. Hari ini keduanya me-restock bersamaan. Tentukan kapan (berapa hari lagi) mereka akan me-restock bersamaan lagi.',
    'essay', 'mudah', 4, 6, 2, 12, 'A',
    'Pedagang A me-restock tiap 4 hari; Pedagang B tiap 6 hari; hari ini keduanya bersamaan.',
    'Berapa hari lagi kedua pedagang akan me-restock bersamaan lagi?',
    'Mencari KPK dari 4 dan 6, karena hari mereka me-restock bersama lagi adalah kelipatan persekutuan terkecil kedua bilangan.',
    '12 habis dibagi 4 (=3 kali) dan 6 (=2 kali). Kesimpulan: Mereka akan me-restock bersamaan lagi 12 hari kemudian.',
    'Pedagang A me-restock tiap 4 hari; Pedagang B tiap 6 hari; hari ini keduanya bersamaan.',
    'Berapa hari lagi kedua pedagang akan me-restock bersamaan lagi?',
    'Mencari KPK dari 4 dan 6, karena hari mereka me-restock bersama lagi adalah kelipatan persekutuan terkecil kedua bilangan.',
    'Kelipatan 4 = 4, 8, 12. Kelipatan 6 = 6, 12. KPK = 12. Maka mereka me-restock bersama lagi 12 hari kemudian.',
    '12 habis dibagi 4 (=3 kali) dan 6 (=2 kali).',
    10, 110, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    answer_know = EXCLUDED.answer_know, answer_asked = EXCLUDED.answer_asked,
    answer_plan = EXCLUDED.answer_plan, answer_solution = EXCLUDED.answer_solution,
    answer_check = EXCLUDED.answer_check, score_weight = EXCLUDED.score_weight,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 4: 4, 8, 12", "Kelipatan 6: 6, 12", "Kelipatan persekutuan terkecil (KPK) = 12"]'::jsonb, 12),
    (q_id, 'prime_factorization', '["4 = 2²", "6 = 2 × 3", "KPK = 2² × 3 = 12"]'::jsonb, 12),
    (q_id, 'repeated_division', '["Bagi 4 dan 6 dengan 2: 2 dan 3", "Bagi dengan 2: 1 dan 3", "Bagi dengan 3: 1 dan 1", "KPK = 2 × 2 × 3 = 12"]'::jsonb, 12);

  -- -------------------------------------------------------------------
  -- 12. ES02 (Sedang) - Keberangkatan tiga bus
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation,
    answer_know, answer_asked, answer_plan, answer_solution, answer_check, score_weight, display_order, is_active
  ) VALUES (
    'ES02',
    'Tiga bus berangkat dari terminal masing-masing setiap 5 menit, 10 menit, dan 15 menit sekali. Jika ketiganya berangkat bersamaan pukul 06.00, tentukan pukul berapa ketiganya akan berangkat bersamaan lagi.',
    'essay', 'sedang', 5, 10, 15, 3, 30, 'A',
    'Tiga bus berangkat tiap 5, 10, dan 15 menit; ketiganya bersama pukul 06.00.',
    'Pukul berapa ketiga bus berangkat bersamaan lagi?',
    'Mencari KPK dari 5, 10, dan 15 untuk mendapatkan selisih menit sampai ketiganya berangkat bersamaan lagi.',
    '30 habis dibagi 5 (=6 kali), 10 (=3 kali), dan 15 (=2 kali); 06.00 + 30 menit = 06.30. Kesimpulan: Ketiga bus berangkat bersamaan lagi pada pukul 06.30.',
    'Tiga bus berangkat tiap 5, 10, dan 15 menit; ketiganya bersama pukul 06.00.',
    'Pukul berapa ketiga bus berangkat bersamaan lagi?',
    'Mencari KPK dari 5, 10, dan 15 untuk mendapatkan selisih menit sampai ketiganya berangkat bersamaan lagi.',
    'KPK dari 5, 10, 15 = 30 menit. 06.00 + 30 menit = 06.30.',
    '30 habis dibagi 5, 10, dan 15.',
    10, 120, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, number_c = EXCLUDED.number_c, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    answer_know = EXCLUDED.answer_know, answer_asked = EXCLUDED.answer_asked,
    answer_plan = EXCLUDED.answer_plan, answer_solution = EXCLUDED.answer_solution,
    answer_check = EXCLUDED.answer_check, score_weight = EXCLUDED.score_weight,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 5: 5, 10, 15, 20, 25, 30", "Kelipatan 10: 10, 20, 30", "Kelipatan 15: 15, 30", "Kelipatan persekutuan terkecil (KPK) = 30"]'::jsonb, 30),
    (q_id, 'prime_factorization', '["5 = 5", "10 = 2 × 5", "15 = 3 × 5", "KPK = 2 × 3 × 5 = 30"]'::jsonb, 30),
    (q_id, 'repeated_division', '["Bagi 5, 10, 15 dengan 2: 5, 5, 15", "Bagi dengan 3: 5, 5, 5", "Bagi dengan 5: 1, 1, 1", "KPK = 2 × 3 × 5 = 30"]'::jsonb, 30);

  -- -------------------------------------------------------------------
  -- 13. ES03 (Sedang) - Program peminjaman & pengembalian buku
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation,
    answer_know, answer_asked, answer_plan, answer_solution, answer_check, score_weight, display_order, is_active
  ) VALUES (
    'ES03',
    'Sebuah perpustakaan sekolah mengadakan program peminjaman buku setiap 8 hari sekali dan program pengembalian buku setiap 12 hari sekali. Kedua program dimulai bersamaan pada tanggal 1. Tentukan tanggal berapa kedua program akan berlangsung bersamaan lagi.',
    'essay', 'sedang', 8, 12, 2, 24, 'A',
    'Program peminjaman tiap 8 hari; program pengembalian tiap 12 hari; keduanya dimulai bersama tanggal 1.',
    'Tanggal berapa kedua program berlangsung bersamaan lagi?',
    'Mencari KPK dari 8 dan 12, kemudian menambahkan hasilnya ke tanggal mulai (tanggal 1).',
    '24 habis dibagi 8 (=3 kali) dan 12 (=2 kali); tanggal 1 + 24 hari = tanggal 25. Kesimpulan: Kedua program berlangsung bersamaan lagi pada tanggal 25.',
    'Program peminjaman tiap 8 hari; program pengembalian tiap 12 hari; keduanya dimulai bersama tanggal 1.',
    'Tanggal berapa kedua program berlangsung bersamaan lagi?',
    'Mencari KPK dari 8 dan 12, kemudian menambahkan hasilnya ke tanggal mulai (tanggal 1).',
    'KPK 8 dan 12 = 24 hari. Tanggal 1 + 24 = Tanggal 25.',
    '24 habis dibagi 8 dan 12.',
    10, 130, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    answer_know = EXCLUDED.answer_know, answer_asked = EXCLUDED.answer_asked,
    answer_plan = EXCLUDED.answer_plan, answer_solution = EXCLUDED.answer_solution,
    answer_check = EXCLUDED.answer_check, score_weight = EXCLUDED.score_weight,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 8: 8, 16, 24", "Kelipatan 12: 12, 24", "Kelipatan persekutuan terkecil (KPK) = 24"]'::jsonb, 24),
    (q_id, 'prime_factorization', '["8 = 2³", "12 = 2² × 3", "KPK = 2³ × 3 = 8 × 3 = 24"]'::jsonb, 24),
    (q_id, 'repeated_division', '["Bagi 8 dan 12 dengan 2: 4 dan 6", "Bagi dengan 2: 2 dan 3", "Bagi dengan 2: 1 dan 3", "Bagi dengan 3: 1 dan 1", "KPK = 2 × 2 × 2 × 3 = 24"]'::jsonb, 24);

  -- -------------------------------------------------------------------
  -- 14. ES04 (HOTS) - Paket oleh-oleh tiga jenis kue kering
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation,
    answer_know, answer_asked, answer_plan, answer_solution, answer_check, score_weight, display_order, is_active
  ) VALUES (
    'ES04',
    'Sebuah toko oleh-oleh mengemas tiga jenis kue kering dalam kemasan berisi 12, 18, dan 24 keping. Toko ingin membuat paket oleh-oleh yang berisi ketiga jenis kue dengan jumlah yang sama banyak, menggunakan jumlah kemasan paling sedikit dari tiap jenis. Tentukan jumlah minimum tiap jenis kue tersebut, dan jelaskan mengapa jawabanmu merupakan jumlah paling minimum.',
    'essay', 'hots', 12, 18, 24, 3, 72, 'A',
    'Kue dikemas isi 12, 18, dan 24 keping; toko ingin jumlah ketiga jenis sama banyak dengan kemasan paling sedikit.',
    'Berapa jumlah minimum tiap jenis kue agar ketiganya sama banyak?',
    'Mencari KPK dari 12, 18, dan 24 menggunakan faktorisasi prima karena melibatkan tiga bilangan yang cukup besar.',
    '72 habis dibagi 12 (=6 kemasan), 18 (=4 kemasan), dan 24 (=3 kemasan); tidak ada bilangan lebih kecil yang habis dibagi ketiganya sekaligus. Kesimpulan: Jumlah minimum tiap jenis kue adalah 72 keping, karena 72 adalah kelipatan persekutuan terkecil dari 12, 18, dan 24 bilangan manapun yang lebih kecil tidak habis dibagi ketiganya sekaligus.',
    'Kue dikemas isi 12, 18, dan 24 keping; toko ingin jumlah ketiga jenis sama banyak dengan kemasan paling sedikit.',
    'Berapa jumlah minimum tiap jenis kue agar ketiganya sama banyak?',
    'Mencari KPK dari 12, 18, dan 24 menggunakan faktorisasi prima karena melibatkan tiga bilangan yang cukup besar.',
    '12 = 2² × 3, 18 = 2 × 3², 24 = 2³ × 3. KPK = 2³ × 3² = 8 × 9 = 72 keping.',
    '72 habis dibagi 12 (=6), 18 (=4), dan 24 (=3).',
    10, 140, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, number_c = EXCLUDED.number_c, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    answer_know = EXCLUDED.answer_know, answer_asked = EXCLUDED.answer_asked,
    answer_plan = EXCLUDED.answer_plan, answer_solution = EXCLUDED.answer_solution,
    answer_check = EXCLUDED.answer_check, score_weight = EXCLUDED.score_weight,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 12: 12, 24, 36, 48, 60, 72", "Kelipatan 18: 18, 36, 54, 72", "Kelipatan 24: 24, 48, 72", "Kelipatan persekutuan terkecil (KPK) = 72"]'::jsonb, 72),
    (q_id, 'prime_factorization', '["12 = 2² × 3", "18 = 2 × 3²", "24 = 2³ × 3", "KPK = 2³ × 3² = 8 × 9 = 72"]'::jsonb, 72),
    (q_id, 'repeated_division', '["Bagi 12, 18, 24 dengan 2: 6, 9, 12", "Bagi dengan 2: 3, 9, 6", "Bagi dengan 2: 3, 9, 3", "Bagi dengan 3: 1, 3, 1", "Bagi dengan 3: 1, 1, 1", "KPK = 2 × 2 × 2 × 3 × 3 = 72"]'::jsonb, 72);

  -- -------------------------------------------------------------------
  -- 15. ES05 (HOTS) - Jadwal ronda tiga penjaga malam dalam setahun
  -- -------------------------------------------------------------------
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, final_explanation,
    answer_know, answer_asked, answer_plan, answer_solution, answer_check, score_weight, display_order, is_active
  ) VALUES (
    'ES05',
    'Tiga penjaga malam bergiliran ronda: penjaga 1 setiap 6 hari, penjaga 2 setiap 8 hari, dan penjaga 3 setiap 9 hari. Ketiganya bertugas bersama pada tanggal 1 Januari. Jika satu tahun berjumlah 365 hari, berapa kali dalam setahun ketiganya akan bertugas bersama (termasuk tanggal 1 Januari)? Jelaskan langkah-langkah dan alasan perhitunganmu.',
    'essay', 'hots', 6, 8, 9, 3, 72, 'A',
    'Penjaga 1 tiap 6 hari, penjaga 2 tiap 8 hari, penjaga 3 tiap 9 hari; ketiganya bersama pada hari ke-0 (1 Januari); 1 tahun = 365 hari.',
    'Berapa kali ketiganya bertugas bersama dalam 365 hari (termasuk hari pertama)?',
    'Mencari KPK dari 6, 8, dan 9 untuk mengetahui jarak hari antarkejadian bersama, lalu mengevaluasi berapa kali kejadian itu terjadi dalam 365 hari.',
    'KPK dari 6, 8, dan 9 adalah 72 hari. Kejadian bersama terjadi pada hari ke-0, 72, 144, 216, 288, dan 360 (semuanya ≤ 365, sedangkan hari ke-432 sudah melewati 365). Kesimpulan: Dalam setahun (365 hari), ketiga penjaga bertugas bersama sebanyak 6 kali.',
    'Penjaga 1 tiap 6 hari, penjaga 2 tiap 8 hari, penjaga 3 tiap 9 hari; ketiganya bersama pada hari ke-0 (1 Januari); 1 tahun = 365 hari.',
    'Berapa kali ketiganya bertugas bersama dalam 365 hari (termasuk hari pertama)?',
    'Mencari KPK dari 6, 8, dan 9 untuk mengetahui jarak hari antarkejadian bersama, lalu mengevaluasi berapa kali kejadian itu terjadi dalam 365 hari.',
    'KPK 6, 8, 9 = 72 hari. Kejadian bersama: hari ke-0, 72, 144, 216, 288, 360 = 6 kali.',
    '72 habis dibagi 6, 8, dan 9. Hari ke-432 melebihi 365 hari.',
    10, 150, true
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story, question_type = EXCLUDED.question_type, difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a, number_b = EXCLUDED.number_b, number_c = EXCLUDED.number_c, operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value, correct_option = EXCLUDED.correct_option,
    known_information = EXCLUDED.known_information, asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy, final_explanation = EXCLUDED.final_explanation,
    answer_know = EXCLUDED.answer_know, answer_asked = EXCLUDED.answer_asked,
    answer_plan = EXCLUDED.answer_plan, answer_solution = EXCLUDED.answer_solution,
    answer_check = EXCLUDED.answer_check, score_weight = EXCLUDED.score_weight,
    display_order = EXCLUDED.display_order, is_active = true
  RETURNING id INTO q_id;

  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '["Kelipatan 6: 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72", "Kelipatan 8: 8, 16, 24, 32, 40, 48, 56, 64, 72", "Kelipatan 9: 9, 18, 27, 36, 45, 54, 63, 72", "Kelipatan persekutuan terkecil (KPK) = 72"]'::jsonb, 72),
    (q_id, 'prime_factorization', '["6 = 2 × 3", "8 = 2³", "9 = 3²", "KPK = 2³ × 3² = 8 × 9 = 72"]'::jsonb, 72),
    (q_id, 'repeated_division', '["Bagi 6, 8, 9 dengan 2: 3, 4, 9", "Bagi dengan 2: 3, 2, 9", "Bagi dengan 2: 3, 1, 9", "Bagi dengan 3: 1, 1, 3", "Bagi dengan 3: 1, 1, 1", "KPK = 2 × 2 × 2 × 3 × 3 = 72"]'::jsonb, 72);

END $$;
