ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS answer_know_image_url TEXT,
  ADD COLUMN IF NOT EXISTS answer_asked_image_url TEXT,
  ADD COLUMN IF NOT EXISTS answer_plan_image_url TEXT,
  ADD COLUMN IF NOT EXISTS answer_solution_image_url TEXT,
  ADD COLUMN IF NOT EXISTS answer_check_image_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learning-images',
  'learning-images',
  TRUE,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
