-- Menyesuaikan tujuan pembelajaran dengan rumusan pada perangkat ajar.
update public.learning_contents
set body = case title
  when 'Memahami konsep KPK' then
    'Melalui media pembelajaran Ludo Web, murid kelas V mampu menjelaskan konsep kelipatan, kelipatan persekutuan, dan KPK dari dua bilangan dengan tepat, minimal 75% dari soal yang diberikan.'
  when 'Memahami masalah' then
    'Melalui media pembelajaran Ludo Web, murid kelas V mampu mengidentifikasi informasi yang diketahui dan ditanyakan dari soal cerita yang berkaitan dengan KPK dengan tepat, minimal 75% dari soal yang diberikan.'
  when 'Merencanakan penyelesaian' then
    'Melalui media pembelajaran Ludo Web, murid kelas V mampu menyusun strategi penyelesaian masalah kontekstual yang melibatkan dua bilangan menggunakan konsep KPK dengan tepat, minimal 75% dari soal yang diberikan.'
  when 'Menyelesaikan dan memeriksa' then
    'Melalui media pembelajaran Ludo Web, murid kelas V mampu menyelesaikan masalah kontekstual sehari-hari menggunakan KPK dari dua bilangan serta memeriksa kembali ketepatan jawaban yang diperoleh secara tepat dan konsisten, minimal 75% dari soal yang diberikan.'
end,
display_order = case title
  when 'Memahami konsep KPK' then 1
  when 'Memahami masalah' then 2
  when 'Merencanakan penyelesaian' then 3
  when 'Menyelesaikan dan memeriksa' then 4
end,
is_active = true
where content_type = 'objective'
  and title in (
    'Memahami konsep KPK',
    'Memahami masalah',
    'Merencanakan penyelesaian',
    'Menyelesaikan dan memeriksa'
  );
