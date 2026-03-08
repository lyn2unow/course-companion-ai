
ALTER TABLE public.generated_content
  ADD COLUMN IF NOT EXISTS is_current_version boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS human_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS human_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_content text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
