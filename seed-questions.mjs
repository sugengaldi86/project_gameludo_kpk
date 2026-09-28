import { createClient } from '@supabase/supabase-js';

const url = 'https://tliabhiwngjhmekgkeez.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaWFiaGl3bmdqaG1la2drZWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg1ODgxMiwiZXhwIjoyMTA1NDM0ODEyfQ.QOxJCGeYcxD8uIC-kOcpeKiQ5jtQ9J4TQcn2ZyzCH2Y';
const supabase = createClient(url, key);

const questions = [
  // PG 1
  {
    q: { question_code: 'PG01', story: 'Dua sahabat menabung di celengan. Rendi menabung setiap 3 hari sekali, dan Fajar menabung setiap 5 hari sekali. Hari ini mereka menabung bersamaan. Berapa hari lagi mereka akan menabung bersamaan lagi?', question_type: 'multiple_choice', difficulty: 'mudah', number_a: 3, number_b: 5, correct_value: 15, correct_option: 'B', final_explanation: '1. Memahami Masalah: Diketahui Rendi menabung setiap 3 hari; Fajar setiap 5 hari; hari ini menabung bersamaan. Ditanya berapa hari lagi menabung bersamaan.\n2. Merencanakan Penyelesaian: Mencari KPK dari 3 dan 5.\n3. Melaksanakan Rencana: Kelipatan 3 (3,6,9,12,15), Kelipatan 5 (5,10,15). KPK = 15.\n4. Memeriksa Kembali: 15 habis dibagi 3 dan 5. Jawaban: (B)', display_order: 10, is_active: true },
    options: [{ option_key: 'A', option_text: '10 hari', is_correct: false }, { option_key: 'B', option_text: '15 hari', is_correct: true }, { option_key: 'C', option_text: '20 hari', is_correct: false }, { option_key: 'D', option_text: '30 hari', is_correct: false }]
  },
  // PG 2
  {
    q: { question_code: 'PG02', story: 'Bus Trans A berangkat dari halte setiap 4 menit sekali, sedangkan Bus Trans B berangkat setiap 7 menit sekali. Keduanya berangkat bersamaan pukul 06.00. Pukul berapa keduanya akan berangkat bersamaan lagi?', question_type: 'multiple_choice', difficulty: 'mudah', number_a: 4, number_b: 7, correct_value: 28, correct_option: 'B', final_explanation: '1. Memahami Masalah: Bus A tiap 4 menit; Bus B tiap 7 menit; bersama pukul 06.00.\n2. Merencanakan Penyelesaian: Mencari KPK dari 4 dan 7, ditambahkan ke 06.00.\n3. Melaksanakan Rencana: Kelipatan 4 dan 7 bertemu di 28.\n4. Memeriksa Kembali: 06.00 + 28 menit = 06.28. Jawaban: (B)', display_order: 20, is_active: true },
    options: [{ option_key: 'A', option_text: '06.21', is_correct: false }, { option_key: 'B', option_text: '06.28', is_correct: true }, { option_key: 'C', option_text: '06.35', is_correct: false }, { option_key: 'D', option_text: '07.00', is_correct: false }]
  },
  // PG 3
  {
    q: { question_code: 'PG03', story: 'Siti pergi ke perpustakaan setiap 6 hari sekali dan berenang setiap 10 hari sekali. Hari ini ia melakukan keduanya secara bersamaan. Setelah berapa hari lagi Siti akan melakukan keduanya bersamaan lagi?', question_type: 'multiple_choice', difficulty: 'mudah', number_a: 6, number_b: 10, correct_value: 30, correct_option: 'C', final_explanation: '1. Memahami Masalah: Perpustakaan tiap 6 hari; berenang tiap 10 hari.\n2. Merencanakan Penyelesaian: Mencari KPK dari 6 dan 10.\n3. Melaksanakan Rencana: KPK = 30.\n4. Memeriksa Kembali: 30 habis dibagi 6 dan 10. Jawaban: (C)', display_order: 30, is_active: true },
    options: [{ option_key: 'A', option_text: '16 hari', is_correct: false }, { option_key: 'B', option_text: '20 hari', is_correct: false }, { option_key: 'C', option_text: '30 hari', is_correct: true }, { option_key: 'D', option_text: '60 hari', is_correct: false }]
  },
  // PG 4
  {
    q: { question_code: 'PG04', story: 'Kelas 5A piket setiap 9 hari sekali dan Kelas 5B piket setiap 12 hari sekali di ruang perpustakaan sekolah. Hari ini keduanya piket bersamaan. Setelah berapa hari kedua kelas akan piket bersamaan lagi?', question_type: 'multiple_choice', difficulty: 'mudah', number_a: 9, number_b: 12, correct_value: 36, correct_option: 'D', final_explanation: '1. Memahami Masalah: 5A tiap 9 hari; 5B tiap 12 hari.\n2. Merencanakan Penyelesaian: Mencari KPK 9 dan 12.\n3. Melaksanakan Rencana: KPK 9 dan 12 adalah 36.\n4. Memeriksa Kembali: 36 habis dibagi 9 dan 12. Jawaban: (D)', display_order: 40, is_active: true },
    options: [{ option_key: 'A', option_text: '21 hari', is_correct: false }, { option_key: 'B', option_text: '24 hari', is_correct: false }, { option_key: 'C', option_text: '48 hari', is_correct: false }, { option_key: 'D', option_text: '36 hari', is_correct: true }]
  },
  // PG 5
  {
    q: { question_code: 'PG05', story: 'Lampu hias merah berkedip setiap 10 detik sekali, sedangkan lampu hias kuning berkedip setiap 15 detik sekali. Keduanya menyala bersamaan pada detik ke-0. Pada detik keberapa kedua lampu akan berkedip bersamaan lagi?', question_type: 'multiple_choice', difficulty: 'sedang', number_a: 10, number_b: 15, correct_value: 30, correct_option: 'C', final_explanation: '1. Memahami Masalah: Merah tiap 10 detik; kuning tiap 15 detik.\n2. Merencanakan Penyelesaian: Mencari KPK 10 dan 15.\n3. Melaksanakan Rencana: KPK 10 dan 15 adalah 30.\n4. Memeriksa Kembali: 30 habis dibagi 10 dan 15. Jawaban: (C)', display_order: 50, is_active: true },
    options: [{ option_key: 'A', option_text: '45 detik', is_correct: false }, { option_key: 'B', option_text: '25 detik', is_correct: false }, { option_key: 'C', option_text: '30 detik', is_correct: true }, { option_key: 'D', option_text: '20 detik', is_correct: false }]
  },
  // PG 6
  {
    q: { question_code: 'PG06', story: 'Petugas kebersihan RT 01 mengambil sampah setiap 14 hari sekali, sedangkan RT 02 setiap 21 hari sekali. Hari ini keduanya mengambil sampah bersamaan. Setelah berapa hari lagi kedua RT mengambil sampah bersamaan?', question_type: 'multiple_choice', difficulty: 'sedang', number_a: 14, number_b: 21, correct_value: 42, correct_option: 'B', final_explanation: 'KPK 14 dan 21 adalah 42. Jawaban: (B)', display_order: 60, is_active: true },
    options: [{ option_key: 'A', option_text: '35 hari', is_correct: false }, { option_key: 'B', option_text: '42 hari', is_correct: true }, { option_key: 'C', option_text: '49 hari', is_correct: false }, { option_key: 'D', option_text: '63 hari', is_correct: false }]
  },
  // PG 7
  {
    q: { question_code: 'PG07', story: 'Mesin pabrik I menyelesaikan satu batch produksi setiap 8 jam, sedangkan mesin pabrik II setiap 20 jam. Keduanya menyelesaikan batch pertama bersamaan pada jam ke-0. Pada jam keberapa kedua mesin akan menyelesaikan batch secara bersamaan lagi?', question_type: 'multiple_choice', difficulty: 'sedang', number_a: 8, number_b: 20, correct_value: 40, correct_option: 'D', final_explanation: 'KPK 8 dan 20 adalah 40. Jawaban: (D)', display_order: 70, is_active: true },
    options: [{ option_key: 'A', option_text: '28 jam', is_correct: false }, { option_key: 'B', option_text: '30 jam', is_correct: false }, { option_key: 'C', option_text: '38 jam', is_correct: false }, { option_key: 'D', option_text: '40 jam', is_correct: true }]
  },
  // PG 8
  {
    q: { question_code: 'PG08', story: 'Tiga alarm di rumah Dito berbunyi otomatis: alarm dapur setiap 6 menit, alarm kamar setiap 8 menit, dan alarm garasi setiap 12 menit. Ketiganya berbunyi bersamaan pukul 05.00. Pukul berapa ketiga alarm akan berbunyi bersamaan lagi?', question_type: 'multiple_choice', difficulty: 'tiga_bilangan', number_a: 6, number_b: 8, number_c: 12, correct_value: 24, correct_option: 'C', final_explanation: 'KPK 6, 8, dan 12 adalah 24. 05.00 + 24 menit = 05.24. Jawaban: (C)', display_order: 80, is_active: true },
    options: [{ option_key: 'A', option_text: '05.16', is_correct: false }, { option_key: 'B', option_text: '05.20', is_correct: false }, { option_key: 'C', option_text: '05.24', is_correct: true }, { option_key: 'D', option_text: '05.30', is_correct: false }]
  },
  // PG 9
  {
    q: { question_code: 'PG09', story: 'Tiga petugas ronda bergiliran jaga malam: petugas 1 setiap 10 hari, petugas 2 setiap 15 hari, dan petugas 3 setiap 25 hari. Ketiganya bertugas bersama pada 1 Januari. Setelah berapa hari ketiganya akan bertugas bersama lagi?', question_type: 'multiple_choice', difficulty: 'tiga_bilangan', number_a: 10, number_b: 15, number_c: 25, correct_value: 150, correct_option: 'D', final_explanation: 'KPK 10, 15, 25 adalah 150. Jawaban: (D)', display_order: 90, is_active: true },
    options: [{ option_key: 'A', option_text: '50 hari', is_correct: false }, { option_key: 'B', option_text: '75 hari', is_correct: false }, { option_key: 'C', option_text: '100 hari', is_correct: false }, { option_key: 'D', option_text: '150 hari', is_correct: true }]
  },
  // PG 10
  {
    q: { question_code: 'PG10', story: 'Di sebuah stasiun, kereta jurusan A berangkat setiap 18 menit sekali dan kereta jurusan B setiap 24 menit sekali. Jam operasional stasiun berlangsung 6 jam (360 menit), dimulai saat kedua kereta berangkat bersamaan pada menit ke-0. Berapa kali total kedua kereta berangkat bersamaan selama 360 menit tersebut (termasuk keberangkatan pertama pada menit ke-0)?', question_type: 'multiple_choice', difficulty: 'tiga_bilangan', number_a: 18, number_b: 24, correct_value: 72, correct_option: 'C', final_explanation: 'KPK 18 dan 24 adalah 72. 360 / 72 = 5 kali tambahan. Ditambah menit ke-0 = 6 kali. Jawaban: (C)', display_order: 100, is_active: true },
    options: [{ option_key: 'A', option_text: '4 kali', is_correct: false }, { option_key: 'B', option_text: '5 kali', is_correct: false }, { option_key: 'C', option_text: '6 kali', is_correct: true }, { option_key: 'D', option_text: '8 kali', is_correct: false }]
  }
];

const essays = [
  {
    q: { question_code: 'ES01', story: 'Pedagang A me-restock dagangannya setiap 4 hari sekali, sedangkan Pedagang B me-restock setiap 6 hari sekali. Hari ini keduanya me-restock bersamaan. Tentukan kapan (berapa hari lagi) mereka akan me-restock bersamaan lagi.', question_type: 'essay', difficulty: 'mudah', number_a: 4, number_b: 6, correct_value: 12, known_information: 'Pedagang A me-restock tiap 4 hari; Pedagang B tiap 6 hari; hari ini keduanya bersamaan.', asked_information: 'Berapa hari lagi kedua pedagang akan me-restock bersamaan lagi?', strategy: 'Mencari KPK dari 4 dan 6, karena hari mereka me-restock bersama lagi adalah kelipatan persekutuan terkecil.', display_order: 110, is_active: true },
    solutions: [{ method: 'multiples', steps: ["Kelipatan 4: 4, 8, 12", "Kelipatan 6: 6, 12", "KPK = 12"], result: 12 }]
  },
  {
    q: { question_code: 'ES02', story: 'Tiga bus berangkat dari terminal masing-masing setiap 5 menit, 10 menit, dan 15 menit sekali. Jika ketiganya berangkat bersamaan pukul 06.00, tentukan pukul berapa ketiganya akan berangkat bersamaan lagi.', question_type: 'essay', difficulty: 'sedang', number_a: 5, number_b: 10, number_c: 15, correct_value: 30, known_information: 'Tiga bus berangkat tiap 5, 10, dan 15 menit; bersama pukul 06.00.', asked_information: 'Pukul berapa ketiga bus berangkat bersamaan lagi?', strategy: 'Mencari KPK dari 5, 10, dan 15.', display_order: 120, is_active: true },
    solutions: [{ method: 'prime_factorization', steps: ["5 = 5", "10 = 2 × 5", "15 = 3 × 5", "KPK = 2 × 3 × 5 = 30", "06.00 + 30 menit = 06.30"], result: 30 }]
  },
  {
    q: { question_code: 'ES03', story: 'Sebuah perpustakaan sekolah mengadakan program peminjaman buku setiap 8 hari sekali dan program pengembalian buku setiap 12 hari sekali. Kedua program dimulai bersamaan pada tanggal 1. Tentukan tanggal berapa kedua program akan berlangsung bersamaan lagi.', question_type: 'essay', difficulty: 'sedang', number_a: 8, number_b: 12, correct_value: 24, known_information: 'Program peminjaman tiap 8 hari; pengembalian tiap 12 hari; bersama tanggal 1.', asked_information: 'Tanggal berapa kedua program berlangsung bersamaan lagi?', strategy: 'Mencari KPK dari 8 dan 12, kemudian menambahkan hasilnya ke tanggal mulai (tanggal 1).', display_order: 130, is_active: true },
    solutions: [{ method: 'multiples', steps: ["KPK 8 dan 12 = 24", "Tanggal 1 + 24 hari = tanggal 25"], result: 24 }]
  },
  {
    q: { question_code: 'ES04', story: 'Sebuah toko oleh-oleh mengemas tiga jenis kue kering dalam kemasan berisi 12, 18, dan 24 keping. Toko ingin membuat paket oleh-oleh yang berisi ketiga jenis kue dengan jumlah yang sama banyak, menggunakan jumlah kemasan paling sedikit dari tiap jenis. Tentukan jumlah minimum tiap jenis kue tersebut, dan jelaskan mengapa jawabanmu merupakan jumlah paling minimum.', question_type: 'essay', difficulty: 'tiga_bilangan', number_a: 12, number_b: 18, number_c: 24, correct_value: 72, known_information: 'Kue dikemas isi 12, 18, dan 24 keping; toko ingin jumlah ketiga jenis sama banyak dengan kemasan paling sedikit.', asked_information: 'Berapa jumlah minimum tiap jenis kue agar ketiganya sama banyak?', strategy: 'Mencari KPK dari 12, 18, dan 24.', display_order: 140, is_active: true },
    solutions: [{ method: 'prime_factorization', steps: ["12 = 2² × 3", "18 = 2 × 3²", "24 = 2³ × 3", "KPK = 2³ × 3² = 72"], result: 72 }]
  },
  {
    q: { question_code: 'ES05', story: 'Tiga penjaga malam bergiliran ronda: penjaga 1 setiap 6 hari, penjaga 2 setiap 8 hari, dan penjaga 3 setiap 9 hari. Ketiganya bertugas bersama pada tanggal 1 Januari. Jika satu tahun berjumlah 365 hari, berapa kali dalam setahun ketiganya akan bertugas bersama (termasuk tanggal 1 Januari)? Jelaskan langkah-langkah dan alasan perhitunganmu.', question_type: 'essay', difficulty: 'tiga_bilangan', number_a: 6, number_b: 8, number_c: 9, correct_value: 72, known_information: 'Penjaga 1 tiap 6 hari, penjaga 2 tiap 8 hari, penjaga 3 tiap 9 hari; bersama hari ke-0 (1 Jan); 1 tahun = 365 hari.', asked_information: 'Berapa kali ketiganya bertugas bersama dalam 365 hari?', strategy: 'Mencari KPK dari 6, 8, dan 9 untuk jarak hari antarkejadian bersama, lalu evaluasi jumlah kejadian dalam 365 hari.', display_order: 150, is_active: true },
    solutions: [{ method: 'multiples', steps: ["KPK dari 6, 8, 9 adalah 72", "Hari bersama: 0, 72, 144, 216, 288, 360", "Total 6 kali bertugas bersama"], result: 72 }]
  }
];

async function run() {
  console.log('Deactivating old questions...');
  await supabase.from('questions').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('Inserting PG...');
  for (const item of questions) {
    const { data: qData, error: qError } = await supabase.from('questions').upsert(item.q, { onConflict: 'question_code' }).select().single();
    if (qError) { console.error('Error upserting PG:', qError); return; }
    
    await supabase.from('question_options').delete().eq('question_id', qData.id);
    const options = item.options.map(opt => ({ ...opt, question_id: qData.id }));
    const { error: optError } = await supabase.from('question_options').insert(options);
    if (optError) { console.error('Error inserting PG options:', optError); return; }
  }

  console.log('Inserting Essay...');
  for (const item of essays) {
    const { data: qData, error: qError } = await supabase.from('questions').upsert(item.q, { onConflict: 'question_code' }).select().single();
    if (qError) { console.error('Error upserting Essay:', qError); return; }
    
    await supabase.from('question_solutions').delete().eq('question_id', qData.id);
    const solutions = item.solutions.map(sol => ({ ...sol, question_id: qData.id }));
    const { error: solError } = await supabase.from('question_solutions').insert(solutions);
    if (solError) { console.error('Error inserting Essay solutions:', solError); return; }
  }

  console.log('Done!');
}

run();
