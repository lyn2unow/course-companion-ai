
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_teaching_philosophy text,
  ADD COLUMN IF NOT EXISTS default_semester text,
  ADD COLUMN IF NOT EXISTS default_source_hierarchy jsonb DEFAULT '["Textbook", "Syllabus", "Lecture Notes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_lms text DEFAULT 'canvas',
  ADD COLUMN IF NOT EXISTS preferred_tone text DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS default_difficulty text DEFAULT 'intermediate';
