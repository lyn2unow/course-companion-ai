

## Plan: Fix objective extraction timing and fallback message

### Changes

**1. `src/pages/CourseSetup.tsx`** (lines 83-86)
- Make `parse-content` calls awaited instead of fire-and-forget: `await supabase.functions.invoke(...)` (remove `.catch(console.error)`)

**2. `supabase/functions/extract-objectives/index.ts`** (lines 36-49)
- Remove the retry loop. Replace with a single query (no retries, no delays) since parse-content will have completed before this function is called.

**3. `src/components/course-setup/CourseObjectives.tsx`** (line 55)
- Change `"No syllabus uploaded. Add your learning objectives manually."` to `"Could not extract objectives automatically. Add them manually below."`

