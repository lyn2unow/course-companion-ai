ALTER TABLE modules ADD COLUMN week_number integer;
ALTER TABLE modules ADD COLUMN learning_objectives jsonb DEFAULT '[]'::jsonb;