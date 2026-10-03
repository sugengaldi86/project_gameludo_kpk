-- Allow free-text essay answers while still rejecting blank answer values.
ALTER TABLE public.player_answers
  DROP CONSTRAINT IF EXISTS player_answers_selected_option_check;

ALTER TABLE public.player_answers
  ADD CONSTRAINT player_answers_selected_option_check
  CHECK (selected_option IS NULL OR length(trim(selected_option)) > 0);

NOTIFY pgrst, 'reload schema';
