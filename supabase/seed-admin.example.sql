-- Jalankan setelah membuat akun guru di Firebase Authentication.
-- Ganti nilai contoh dengan UID dan email dari Firebase Console > Authentication > Users.

insert into public.admins (firebase_uid, email, name, role)
values (
  'GANTI_DENGAN_FIREBASE_UID',
  'guru@sekolah.sch.id',
  'Guru Ludo KPK',
  'admin'
)
on conflict (firebase_uid) do update
set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role;
