

## Plan: Create `extract-objectives` Edge Function

### What it does
New edge function that finds the syllabus material for a course, sends its extracted text to Gemini 2.5 Flash, and returns parsed learning objectives as a string array.

### Implementation

**1. `supabase/functions/extract-objectives/index.ts`**
- Copy the exact pattern from `generate-kudos`: corsHeaders, auth, AI gateway call, ai_usage_log, error handling
- Receives `{ courseId, courseName }`
- Queries `course_materials` for syllabus with extracted text
- If none found, returns `{ objectives: [] }` early
- Calls AI gateway with the specified system/user prompts (first 8000 chars of syllabus)
- Strips markdown fences, JSON.parse, validates it's an array
- Returns `{ objectives: string[] }`
- Logs success/failure to `ai_usage_log` with `feature: "extract_objectives"`, `content_type: "learning_objectives"`
- Handles 429/402 same as generate-quiz

**2. `supabase/config.toml`**
- Add `[functions.extract-objectives]` with `verify_jwt = false`

### No database changes needed
The `ai_usage_log` table already has `content_type` and all required columns.

