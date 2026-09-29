-- Samakan nilai tingkat kesulitan yang diterima database dengan form admin.
alter table public.questions
  drop constraint if exists questions_difficulty_check;

update public.questions
set difficulty = case
  when difficulty = 'tiga_bilangan' then 'hots'
  when difficulty = 'kontekstual' then 'sedang'
  else difficulty
end
where difficulty in ('tiga_bilangan', 'kontekstual');

alter table public.questions
  add constraint questions_difficulty_check
  check (difficulty in ('mudah', 'sedang', 'hots'));

notify pgrst, 'reload schema';
