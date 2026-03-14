

## Plan: Add debug toast notifications to extraction flow

### Change

**`src/pages/CourseSetup.tsx`** (lines 96-104)

Replace the try/catch block inside the `hasSyllabus` check with the expanded version that shows toast notifications for: extraction errors, empty results (with raw data), successful extraction (with count + first objective), and exceptions.

