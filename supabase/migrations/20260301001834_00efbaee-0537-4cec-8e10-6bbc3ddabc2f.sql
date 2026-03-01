ALTER TABLE public.course_materials ADD COLUMN extracted_text text;

CREATE POLICY "Users can update own materials" ON public.course_materials FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);