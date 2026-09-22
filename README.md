# Ludo KPK

Game Ludo edukasi KPK berbasis Next.js 16, Supabase, dan Firebase Authentication. Permainan lokal mendukung 2–4 pemain, bank soal dinamis, penyimpanan state game, serta dashboard laporan admin.

## Menjalankan aplikasi

1. Salin `.env.local.example` menjadi `.env.local` dan isi kredensial Supabase serta Firebase.
2. Jalankan `supabase/schema.sql` pada project Supabase baru.
3. Jalankan semua file di `supabase/migrations` berdasarkan urutan nama file.
4. Ikuti `ADMIN_SETUP.md` untuk membuat akun admin.
5. Instal dependency dan jalankan aplikasi:

```bash
npm install
npm run dev
```

Game tersedia di `http://localhost:3000` dan dashboard di `http://localhost:3000/admin`.

## Aturan game

- Pion hanya keluar dari base dengan angka 6.
- Jawaban KPK yang benar diperlukan sebelum pion dapat bergerak.
- Angka 6 memberi satu giliran tambahan setelah pion bergerak.
- Pion lawan pada jalur utama ditangkap dan dikembalikan ke base, kecuali pada safe zone.
- Pion harus mencapai kotak akhir dengan angka yang tepat.
- Pemain pertama yang menyelesaikan semua pionnya menjadi pemenang.
- Pilihan jawaban hanya dapat dikirim satu kali. Pembahasan tetap ditampilkan sebelum pemain melanjutkan.
- Keluar game memerlukan konfirmasi, mengakhiri room tanpa pemenang, dan mempertahankan riwayat belajar.

## Pemeriksaan kualitas

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Jangan pernah memasukkan `.env.local`, Firebase private key, atau Supabase service-role key ke repository.
