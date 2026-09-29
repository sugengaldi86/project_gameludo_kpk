# Setup akun Admin Ludo KPK

Dashboard memakai **email sebagai username**. Password hanya disimpan dan diverifikasi oleh Firebase Authentication; jangan menaruh password di Supabase atau source code.

## 1. Jalankan migration Supabase

Buka Supabase Dashboard → SQL Editor, lalu jalankan seluruh isi:

Jalankan migration berikut secara berurutan:

1. `supabase/migrations/20260920_secure_game_flow.sql`
2. `supabase/migrations/20260921_resilient_game_state.sql`
3. `supabase/migrations/20260922_game_exit_and_pawn_finish.sql`
4. `supabase/migrations/20260923_allow_abandoned_status.sql`

Migration tersebut menambahkan session guest aman, RLS tabel sensitif, transaksi game, pemulihan state, safe zone, tangkap pion, giliran tambahan angka enam, dan kondisi kemenangan.

## 2. Aktifkan provider Firebase

1. Firebase Console → project `ludo-kpk`.
2. Authentication → Sign-in method.
3. Aktifkan **Email/Password**.
4. Aktifkan **Google** hanya jika tombol Google akan digunakan.

## 3. Buat akun admin

Firebase Console → Authentication → Users → Add user.

Contoh username/email:

`admin.ludokpk@sekolah.sch.id`

Buat password unik minimal 14 karakter yang terdiri dari huruf besar, huruf kecil, angka, dan simbol. Gunakan password manager. Jangan menggunakan contoh password dari dokumentasi dan jangan menyimpan password di repository.

Setelah akun dibuat, salin **User UID** dari Firebase Authentication.

## 4. Daftarkan UID di Supabase

Jalankan di Supabase SQL Editor dengan mengganti tiga nilai contoh:

```sql
insert into public.admins (firebase_uid, email, name, role)
values (
  'UID_DARI_FIREBASE',
  'admin.ludokpk@sekolah.sch.id',
  'Admin Ludo KPK',
  'admin'
)
on conflict (firebase_uid) do update set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role;
```

Role yang diterima aplikasi adalah `admin` dan `super_admin`.

## 5. Uji login

1. Restart Next.js setelah mengubah `.env.local`.
2. Buka `http://localhost:3000/admin/login`.
3. Masuk menggunakan email dan password yang dibuat di Firebase.
4. Pastikan halaman `/admin`, Bank Soal, dan Rekap Nilai dapat dibuka.

### Jika `accounts:signInWithPassword` mengembalikan status 400

Status 400 berasal dari Firebase Authentication, sebelum session admin aplikasi
dibuat. Periksa hal berikut:

1. Firebase Console → Authentication → Sign-in method → pastikan
   **Email/Password** aktif.
2. Firebase Console → Authentication → Users → pastikan email yang digunakan
   benar-benar tersedia, tidak dinonaktifkan, dan passwordnya benar.
3. Firebase Console → Authentication → Settings → Authorized domains → tambahkan
   domain deployment, misalnya `project-gameludo-kpk.vercel.app`.
4. Pastikan seluruh `NEXT_PUBLIC_FIREBASE_*` di Vercel berasal dari Firebase
   project yang sama dengan `FIREBASE_ADMIN_PROJECT_ID`.
5. Setelah mengubah environment variable publik, lakukan deploy ulang karena
   nilainya dimasukkan ke bundle ketika proses build.
6. Setelah login Firebase berhasil, UID user tersebut tetap harus terdaftar pada
   tabel `public.admins` seperti pada langkah 4.

## 6. Rotasi kredensial yang pernah terekspos

Private key Firebase Admin dan Supabase service-role key yang pernah dibagikan harus dianggap terekspos.

1. Google Cloud Console → IAM & Admin → Service Accounts → akun Firebase Admin → Keys.
2. Nonaktifkan/hapus key lama dan buat key baru.
3. Supabase Dashboard → Project Settings → API Keys, lalu rotate secret/service-role key jika tersedia.
4. Perbarui `.env.local` dan Environment Variables Vercel.
5. Jangan menambahkan awalan `NEXT_PUBLIC_` pada kredensial server.
