import { createClient } from '@supabase/supabase-js';

const url = 'https://tliabhiwngjhmekgkeez.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaWFiaGl3bmdqaG1la2drZWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg1ODgxMiwiZXhwIjoyMTA1NDM0ODEyfQ.QOxJCGeYcxD8uIC-kOcpeKiQ5jtQ9J4TQcn2ZyzCH2Y';
const supabase = createClient(url, key);

async function run() {
  console.log('Deactivating old materials...');
  await supabase.from('learning_contents').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('Seeding learning contents...');
  const { error } = await supabase.from('learning_contents').insert([
    { content_type: 'objective', title: 'Memahami konsep KPK', body: 'Menjelaskan kelipatan, kelipatan persekutuan, dan KPK.', display_order: 10, is_active: true },
    { content_type: 'objective', title: 'Memahami masalah', body: 'Mengidentifikasi informasi yang diketahui dan ditanyakan.', display_order: 20, is_active: true },
    { content_type: 'objective', title: 'Merencanakan penyelesaian', body: 'Memilih strategi penyelesaian masalah KPK.', display_order: 30, is_active: true },
    { content_type: 'objective', title: 'Menyelesaikan dan memeriksa', body: 'Melaksanakan perhitungan dan memeriksa kebenaran jawaban.', display_order: 40, is_active: true },
    { content_type: 'material', title: 'Pengertian Kelipatan', body: 'Kelipatan adalah hasil kali suatu bilangan dengan bilangan asli (1, 2, 3, 4, ...).', display_order: 50, is_active: true },
    { content_type: 'material', title: 'Pengertian Kelipatan Persekutuan', body: 'Kelipatan persekutuan adalah kelipatan yang sama yang dimiliki oleh dua bilangan atau lebih.', display_order: 60, is_active: true },
    { content_type: 'material', title: 'Pengertian KPK', body: 'KPK (Kelipatan Persekutuan Terkecil) adalah bilangan paling kecil di antara semua kelipatan persekutuan.', display_order: 70, is_active: true },
    { content_type: 'material', title: 'Menentukan KPK: Mendaftar Kelipatan', body: 'Mendaftar Kelipatan adalah menuliskan kelipatan tiap bilangan, lalu mencari kelipatan persekutuan yang paling kecil.', display_order: 80, is_active: true },
    { content_type: 'material', title: 'Menentukan KPK: Faktorisasi Prima', body: 'Faktorisasi Prima (Pohon Faktor) adalah menguraikan tiap bilangan menjadi perkalian faktor-faktor prima, lalu KPK diperoleh dari perkalian semua faktor prima yang ada dengan mengambil pangkat tertinggi dari tiap faktor.', display_order: 90, is_active: true },
    { content_type: 'material', title: 'Menentukan KPK: Pembagian Berulang', body: 'Pembagian Berulang (Sengkedan) adalah membagi bilangan-bilangan secara bersamaan dengan bilangan prima yang sama, dilakukan berulang hingga hasil bagi seluruhnya menjadi 1, kemudian KPK diperoleh dari perkalian semua bilangan pembagi yang dipakai.', display_order: 100, is_active: true },
    { content_type: 'material', title: 'Contoh Soal Cerita', body: 'Ani menyiram tanaman setiap 4 hari sekali, dan Budi menyiram tanaman setiap 6 hari sekali. Jika hari ini mereka menyiram tanaman bersama-sama, kapan mereka akan menyiram tanaman bersama lagi? Jawaban: KPK dari 4 dan 6 adalah 12.', display_order: 110, is_active: true },
    { content_type: 'material', title: 'Ringkasan Empat Tahap Polya', body: '1. Memahami masalah (Diketahui dan Ditanyakan).\n2. Merencanakan penyelesaian.\n3. Melaksanakan rencana (perhitungan).\n4. Memeriksa kembali.', display_order: 120, is_active: true }
  ]);
  
  if (error) {
    console.error('Error inserting materials:', error);
  } else {
    console.log('Successfully seeded materials!');
  }
}

run();
