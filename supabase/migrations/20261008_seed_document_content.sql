-- Seed data for Media Soal Materi KPK
-- 10 Pilihan Ganda, 5 Uraian
-- Idempotent: aman dijalankan ulang tanpa konflik kode atau data anak ganda.

DO $$
DECLARE
  q_id uuid;
BEGIN
  -- Menonaktifkan materi dan soal lama agar yang muncul hanya yang baru dari dokumen
  UPDATE public.learning_contents SET is_active = false;
  UPDATE public.questions SET is_active = false;

  -- PG 1
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG01', 'Dua sahabat menabung di celengan. Rendi menabung setiap 3 hari sekali, dan Fajar menabung setiap 5 hari sekali. Hari ini mereka menabung bersamaan. Berapa hari lagi mereka akan menabung bersamaan lagi?', 'multiple_choice', 'mudah', 3, 5, 2, 15, 'B', 
    '1. Memahami Masalah: Diketahui Rendi menabung setiap 3 hari; Fajar setiap 5 hari; hari ini menabung bersamaan. Ditanya berapa hari lagi menabung bersamaan.
2. Merencanakan Penyelesaian: Mencari KPK dari 3 dan 5.
3. Melaksanakan Rencana: Kelipatan 3 (3,6,9,12,15), Kelipatan 5 (5,10,15). KPK = 15.
4. Memeriksa Kembali: 15 habis dibagi 3 dan 5. Jawaban: (B)', 10
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '10 hari', false), (q_id, 'B', '15 hari', true), (q_id, 'C', '20 hari', false), (q_id, 'D', '30 hari', false);

  -- PG 2
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG02', 'Bus Trans A berangkat dari halte setiap 4 menit sekali, sedangkan Bus Trans B berangkat setiap 7 menit sekali. Keduanya berangkat bersamaan pukul 06.00. Pukul berapa keduanya akan berangkat bersamaan lagi?', 'multiple_choice', 'mudah', 4, 7, 2, 28, 'B', 
    '1. Memahami Masalah: Bus A tiap 4 menit; Bus B tiap 7 menit; bersama pukul 06.00.
2. Merencanakan Penyelesaian: Mencari KPK dari 4 dan 7, ditambahkan ke 06.00.
3. Melaksanakan Rencana: Kelipatan 4 dan 7 bertemu di 28.
4. Memeriksa Kembali: 06.00 + 28 menit = 06.28. Jawaban: (B)', 20
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '06.21', false), (q_id, 'B', '06.28', true), (q_id, 'C', '06.35', false), (q_id, 'D', '07.00', false);

  -- PG 3
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG03', 'Siti pergi ke perpustakaan setiap 6 hari sekali dan berenang setiap 10 hari sekali. Hari ini ia melakukan keduanya secara bersamaan. Setelah berapa hari lagi Siti akan melakukan keduanya bersamaan lagi?', 'multiple_choice', 'mudah', 6, 10, 2, 30, 'C', 
    '1. Memahami Masalah: Perpustakaan tiap 6 hari; berenang tiap 10 hari.
2. Merencanakan Penyelesaian: Mencari KPK dari 6 dan 10.
3. Melaksanakan Rencana: KPK = 30.
4. Memeriksa Kembali: 30 habis dibagi 6 dan 10. Jawaban: (C)', 30
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '16 hari', false), (q_id, 'B', '20 hari', false), (q_id, 'C', '30 hari', true), (q_id, 'D', '60 hari', false);

  -- PG 4
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG04', 'Kelas 5A piket setiap 9 hari sekali dan Kelas 5B piket setiap 12 hari sekali di ruang perpustakaan sekolah. Hari ini keduanya piket bersamaan. Setelah berapa hari kedua kelas akan piket bersamaan lagi?', 'multiple_choice', 'mudah', 9, 12, 2, 36, 'D', 
    '1. Memahami Masalah: 5A tiap 9 hari; 5B tiap 12 hari.
2. Merencanakan Penyelesaian: Mencari KPK 9 dan 12.
3. Melaksanakan Rencana: KPK 9 dan 12 adalah 36.
4. Memeriksa Kembali: 36 habis dibagi 9 dan 12. Jawaban: (D)', 40
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '21 hari', false), (q_id, 'B', '24 hari', false), (q_id, 'C', '48 hari', false), (q_id, 'D', '36 hari', true);

  -- PG 5
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG05', 'Lampu hias merah berkedip setiap 10 detik sekali, sedangkan lampu hias kuning berkedip setiap 15 detik sekali. Keduanya menyala bersamaan pada detik ke-0. Pada detik keberapa kedua lampu akan berkedip bersamaan lagi?', 'multiple_choice', 'sedang', 10, 15, 2, 30, 'C', 
    '1. Memahami Masalah: Merah tiap 10 detik; kuning tiap 15 detik.
2. Merencanakan Penyelesaian: Mencari KPK 10 dan 15.
3. Melaksanakan Rencana: KPK 10 dan 15 adalah 30.
4. Memeriksa Kembali: 30 habis dibagi 10 dan 15. Jawaban: (C)', 50
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '45 detik', false), (q_id, 'B', '25 detik', false), (q_id, 'C', '30 detik', true), (q_id, 'D', '20 detik', false);

  -- PG 6
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG06', 'Petugas kebersihan RT 01 mengambil sampah setiap 14 hari sekali, sedangkan RT 02 setiap 21 hari sekali. Hari ini keduanya mengambil sampah bersamaan. Setelah berapa hari lagi kedua RT mengambil sampah bersamaan?', 'multiple_choice', 'sedang', 14, 21, 2, 42, 'B', 
    'KPK 14 dan 21 adalah 42. Jawaban: (B)', 60
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '35 hari', false), (q_id, 'B', '42 hari', true), (q_id, 'C', '49 hari', false), (q_id, 'D', '63 hari', false);

  -- PG 7
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG07', 'Mesin pabrik I menyelesaikan satu batch produksi setiap 8 jam, sedangkan mesin pabrik II setiap 20 jam. Keduanya menyelesaikan batch pertama bersamaan pada jam ke-0. Pada jam keberapa kedua mesin akan menyelesaikan batch secara bersamaan lagi?', 'multiple_choice', 'sedang', 8, 20, 2, 40, 'D', 
    'KPK 8 dan 20 adalah 40. Jawaban: (D)', 70
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '28 jam', false), (q_id, 'B', '30 jam', false), (q_id, 'C', '38 jam', false), (q_id, 'D', '40 jam', true);

  -- PG 8
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG08', 'Tiga alarm di rumah Dito berbunyi otomatis: alarm dapur setiap 6 menit, alarm kamar setiap 8 menit, dan alarm garasi setiap 12 menit. Ketiganya berbunyi bersamaan pukul 05.00. Pukul berapa ketiga alarm akan berbunyi bersamaan lagi?', 'multiple_choice', 'hots', 6, 8, 12, 3, 24, 'C', 
    'KPK 6, 8, dan 12 adalah 24. 05.00 + 24 menit = 05.24. Jawaban: (C)', 80
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '05.16', false), (q_id, 'B', '05.20', false), (q_id, 'C', '05.24', true), (q_id, 'D', '05.30', false);

  -- PG 9
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG09', 'Tiga petugas ronda bergiliran jaga malam: petugas 1 setiap 10 hari, petugas 2 setiap 15 hari, dan petugas 3 setiap 25 hari. Ketiganya bertugas bersama pada 1 Januari. Setelah berapa hari ketiganya akan bertugas bersama lagi?', 'multiple_choice', 'hots', 10, 15, 25, 3, 150, 'D', 
    'KPK 10, 15, 25 adalah 150. Jawaban: (D)', 90
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '50 hari', false), (q_id, 'B', '75 hari', false), (q_id, 'C', '100 hari', false), (q_id, 'D', '150 hari', true);

  -- PG 10
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option, final_explanation, display_order
  ) VALUES (
    'PG10', 'Di sebuah stasiun, kereta jurusan A berangkat setiap 18 menit sekali dan kereta jurusan B setiap 24 menit sekali. Jam operasional stasiun berlangsung 6 jam (360 menit), dimulai saat kedua kereta berangkat bersamaan pada menit ke-0. Berapa kali total kedua kereta berangkat bersamaan selama 360 menit tersebut (termasuk keberangkatan pertama pada menit ke-0)?', 'multiple_choice', 'hots', 18, 24, 2, 72, 'C', 
    'KPK 18 dan 24 adalah 72. 360 / 72 = 5 kali tambahan. Ditambah menit ke-0 = 6 kali. Jawaban: (C)', 100
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_options WHERE question_id = q_id;
  INSERT INTO public.question_options (question_id, option_key, option_text, is_correct) VALUES
    (q_id, 'A', '4 kali', false), (q_id, 'B', '5 kali', false), (q_id, 'C', '6 kali', true), (q_id, 'D', '8 kali', false);


  -- Essay 1
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, display_order
  ) VALUES (
    'ES01', 'Pedagang A me-restock dagangannya setiap 4 hari sekali, sedangkan Pedagang B me-restock setiap 6 hari sekali. Hari ini keduanya me-restock bersamaan. Tentukan kapan (berapa hari lagi) mereka akan me-restock bersamaan lagi.', 'essay', 'mudah', 4, 6, 2, 12, 'A',
    'Pedagang A me-restock tiap 4 hari; Pedagang B tiap 6 hari; hari ini keduanya bersamaan.', 'Berapa hari lagi kedua pedagang akan me-restock bersamaan lagi?', 'Mencari KPK dari 4 dan 6, karena hari mereka me-restock bersama lagi adalah kelipatan persekutuan terkecil.', 110
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '{"steps": ["Kelipatan 4: 4, 8, 12", "Kelipatan 6: 6, 12", "KPK = 12"]}', 12);

  -- Essay 2
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, display_order
  ) VALUES (
    'ES02', 'Tiga bus berangkat dari terminal masing-masing setiap 5 menit, 10 menit, dan 15 menit sekali. Jika ketiganya berangkat bersamaan pukul 06.00, tentukan pukul berapa ketiganya akan berangkat bersamaan lagi.', 'essay', 'sedang', 5, 10, 15, 3, 30, 'A',
    'Tiga bus berangkat tiap 5, 10, dan 15 menit; bersama pukul 06.00.', 'Pukul berapa ketiga bus berangkat bersamaan lagi?', 'Mencari KPK dari 5, 10, dan 15.', 120
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'prime_factorization', '{"steps": ["5 = 5", "10 = 2 × 5", "15 = 3 × 5", "KPK = 2 × 3 × 5 = 30", "06.00 + 30 menit = 06.30"]}', 30);

  -- Essay 3
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, display_order
  ) VALUES (
    'ES03', 'Sebuah perpustakaan sekolah mengadakan program peminjaman buku setiap 8 hari sekali dan program pengembalian buku setiap 12 hari sekali. Kedua program dimulai bersamaan pada tanggal 1. Tentukan tanggal berapa kedua program akan berlangsung bersamaan lagi.', 'essay', 'sedang', 8, 12, 2, 24, 'A',
    'Program peminjaman tiap 8 hari; pengembalian tiap 12 hari; bersama tanggal 1.', 'Tanggal berapa kedua program berlangsung bersamaan lagi?', 'Mencari KPK dari 8 dan 12, kemudian menambahkan hasilnya ke tanggal mulai (tanggal 1).', 130
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '{"steps": ["KPK 8 dan 12 = 24", "Tanggal 1 + 24 hari = tanggal 25"]}', 24);

  -- Essay 4
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, display_order
  ) VALUES (
    'ES04', 'Sebuah toko oleh-oleh mengemas tiga jenis kue kering dalam kemasan berisi 12, 18, dan 24 keping. Toko ingin membuat paket oleh-oleh yang berisi ketiga jenis kue dengan jumlah yang sama banyak, menggunakan jumlah kemasan paling sedikit dari tiap jenis. Tentukan jumlah minimum tiap jenis kue tersebut, dan jelaskan mengapa jawabanmu merupakan jumlah paling minimum.', 'essay', 'hots', 12, 18, 24, 3, 72, 'A',
    'Kue dikemas isi 12, 18, dan 24 keping; toko ingin jumlah ketiga jenis sama banyak dengan kemasan paling sedikit.', 'Berapa jumlah minimum tiap jenis kue agar ketiganya sama banyak?', 'Mencari KPK dari 12, 18, dan 24.', 140
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'prime_factorization', '{"steps": ["12 = 2² × 3", "18 = 2 × 3²", "24 = 2³ × 3", "KPK = 2³ × 3² = 72"]}', 72);

  -- Essay 5
  INSERT INTO public.questions (
    question_code, story, question_type, difficulty, number_a, number_b, number_c, operand_count, correct_value, correct_option,
    known_information, asked_information, strategy, display_order
  ) VALUES (
    'ES05', 'Tiga penjaga malam bergiliran ronda: penjaga 1 setiap 6 hari, penjaga 2 setiap 8 hari, dan penjaga 3 setiap 9 hari. Ketiganya bertugas bersama pada tanggal 1 Januari. Jika satu tahun berjumlah 365 hari, berapa kali dalam setahun ketiganya akan bertugas bersama (termasuk tanggal 1 Januari)? Jelaskan langkah-langkah dan alasan perhitunganmu.', 'essay', 'hots', 6, 8, 9, 3, 72, 'A',
    'Penjaga 1 tiap 6 hari, penjaga 2 tiap 8 hari, penjaga 3 tiap 9 hari; bersama hari ke-0 (1 Jan); 1 tahun = 365 hari.', 'Berapa kali ketiganya bertugas bersama dalam 365 hari?', 'Mencari KPK dari 6, 8, dan 9 untuk jarak hari antarkejadian bersama, lalu evaluasi jumlah kejadian dalam 365 hari.', 150
  ) ON CONFLICT (question_code) DO UPDATE SET
    story = EXCLUDED.story,
    question_type = EXCLUDED.question_type,
    difficulty = EXCLUDED.difficulty,
    number_a = EXCLUDED.number_a,
    number_b = EXCLUDED.number_b,
    number_c = EXCLUDED.number_c,
    operand_count = EXCLUDED.operand_count,
    correct_value = EXCLUDED.correct_value,
    correct_option = EXCLUDED.correct_option,
    final_explanation = EXCLUDED.final_explanation,
    known_information = EXCLUDED.known_information,
    asked_information = EXCLUDED.asked_information,
    strategy = EXCLUDED.strategy,
    display_order = EXCLUDED.display_order,
    is_active = true
  RETURNING id INTO q_id;
  DELETE FROM public.question_solutions WHERE question_id = q_id;
  INSERT INTO public.question_solutions (question_id, method, steps, result) VALUES
    (q_id, 'multiples', '{"steps": ["KPK dari 6, 8, 9 adalah 72", "Hari bersama: 0, 72, 144, 216, 288, 360", "Total 6 kali bertugas bersama"]}', 72);

  -- Konten seed memakai tabel tanpa unique constraint untuk judul. Hapus hanya
  -- konten milik seed ini sebelum memasukkannya kembali agar tidak berduplikasi.
  DELETE FROM public.learning_contents
  WHERE (content_type, lower(title)) IN (
    VALUES
      ('objective', lower('Memahami konsep KPK')),
      ('objective', lower('Memahami masalah')),
      ('objective', lower('Merencanakan penyelesaian')),
      ('objective', lower('Menyelesaikan dan memeriksa')),
      ('material', lower('Pengertian Kelipatan')),
      ('material', lower('Pengertian Kelipatan Persekutuan')),
      ('material', lower('Pengertian KPK')),
      ('material', lower('Menentukan KPK: Mendaftar Kelipatan')),
      ('material', lower('Menentukan KPK: Faktorisasi Prima')),
      ('material', lower('Menentukan KPK: Pembagian Berulang')),
      ('material', lower('Contoh Soal Cerita')),
      ('material', lower('Ringkasan Empat Tahap Polya'))
  );

  -- Learning Objectives
  INSERT INTO public.learning_contents (content_type, title, body, display_order, show_in_briefing, is_active) VALUES
    ('objective', 'Memahami konsep KPK', 'Menjelaskan kelipatan, kelipatan persekutuan, dan KPK.', 10, true, true),
    ('objective', 'Memahami masalah', 'Mengidentifikasi informasi yang diketahui dan ditanyakan.', 20, true, true),
    ('objective', 'Merencanakan penyelesaian', 'Memilih strategi penyelesaian masalah KPK.', 30, true, true),
    ('objective', 'Menyelesaikan dan memeriksa', 'Melaksanakan perhitungan dan memeriksa kebenaran jawaban.', 40, true, true);

  -- Learning Materials
  INSERT INTO public.learning_contents (content_type, title, body, display_order, show_in_briefing, is_active) VALUES
    ('material', 'Pengertian Kelipatan', 'Kelipatan adalah hasil kali suatu bilangan dengan bilangan asli (1, 2, 3, 4, ...).', 50, true, true),
    ('material', 'Pengertian Kelipatan Persekutuan', 'Kelipatan persekutuan adalah kelipatan yang sama yang dimiliki oleh dua bilangan atau lebih.', 60, true, true),
    ('material', 'Pengertian KPK', 'KPK (Kelipatan Persekutuan Terkecil) adalah bilangan paling kecil di antara semua kelipatan persekutuan.', 70, true, true),
    ('material', 'Menentukan KPK: Mendaftar Kelipatan', 'Mendaftar Kelipatan adalah menuliskan kelipatan tiap bilangan, lalu mencari kelipatan persekutuan yang paling kecil.', 80, false, true),
    ('material', 'Menentukan KPK: Faktorisasi Prima', 'Faktorisasi Prima (Pohon Faktor) adalah menguraikan tiap bilangan menjadi perkalian faktor-faktor prima, lalu KPK diperoleh dari perkalian semua faktor prima yang ada dengan mengambil pangkat tertinggi dari tiap faktor.', 90, false, true),
    ('material', 'Menentukan KPK: Pembagian Berulang', 'Pembagian Berulang (Sengkedan) adalah membagi bilangan-bilangan secara bersamaan dengan bilangan prima yang sama, dilakukan berulang hingga hasil bagi seluruhnya menjadi 1, kemudian KPK diperoleh dari perkalian semua bilangan pembagi yang dipakai.', 100, false, true),
    ('material', 'Contoh Soal Cerita', 'Ani menyiram tanaman setiap 4 hari sekali, dan Budi menyiram tanaman setiap 6 hari sekali. Jika hari ini mereka menyiram tanaman bersama-sama, kapan mereka akan menyiram tanaman bersama lagi? Jawaban: KPK dari 4 dan 6 adalah 12.', 110, false, true),
    ('material', 'Ringkasan Empat Tahap Polya', '1. Memahami masalah (Diketahui dan Ditanyakan). 2. Merencanakan penyelesaian. 3. Melaksanakan rencana (perhitungan). 4. Memeriksa kembali.', 120, true, true);

END $$;
