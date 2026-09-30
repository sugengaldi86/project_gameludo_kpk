-- Password tetap disimpan dan diverifikasi hanya oleh Firebase Authentication.
-- UID di bawah berasal dari akun Firebase wwidhipriyana@gmail.com.
insert into public.admins (firebase_uid, email, name, role)
values (
  'u7fWabjeKCTdbogucDZcUVriY0p1',
  'wwidhipriyana@gmail.com',
  'Widhi Priyana',
  'super_admin'
)
on conflict (email) do update set
  firebase_uid = excluded.firebase_uid,
  name = excluded.name,
  role = excluded.role;

notify pgrst, 'reload schema';
