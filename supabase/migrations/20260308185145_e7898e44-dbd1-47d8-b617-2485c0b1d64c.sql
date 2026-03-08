
CREATE TABLE public.discussion_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.discussion_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  student_identifier text NOT NULL,
  post_content text NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  meets_criteria boolean NOT NULL DEFAULT false,
  criteria_matched text[] DEFAULT '{}',
  criteria_missed text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own submissions" ON public.discussion_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own submissions" ON public.discussion_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own submissions" ON public.discussion_submissions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own submissions" ON public.discussion_submissions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.kudos_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.discussion_submissions(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.discussion_analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  student_identifier text NOT NULL,
  message text NOT NULL,
  is_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kudos_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own kudos" ON public.kudos_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kudos" ON public.kudos_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kudos" ON public.kudos_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kudos" ON public.kudos_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
