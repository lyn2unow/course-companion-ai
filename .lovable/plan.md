

## Plan: Add retry logic to extract-objectives + remove client-side delay

### Changes

**1. `supabase/functions/extract-objectives/index.ts`** (lines 36-52)

Replace the single syllabus query + early return with a retry loop (3 attempts, 2s delay between retries). If no syllabus with `extracted_text` is found after all attempts, return `{ objectives: [] }`. Then use `syllabusData.extracted_text` instead of `syllabus.extracted_text`.

**2. `src/pages/CourseSetup.tsx`** (line 97)

Delete `await new Promise((r) => setTimeout(r, 3000));` — the edge function now handles the wait internally via retries.

