

# Fix Module Detail Page

## Problem
The module detail page uses `.single()` which throws when no row is found, potentially causing the skeleton to hang. The user also wants week number and learning objectives displayed, but these columns don't exist in the `modules` table yet.

## Changes

### 1. Database Migration
Add two columns to the `modules` table:
```sql
ALTER TABLE modules ADD COLUMN week_number integer;
ALTER TABLE modules ADD COLUMN learning_objectives jsonb DEFAULT '[]'::jsonb;
```

### 2. Fix Data Fetching in `src/pages/ModuleDetail.tsx`
- Change `.single()` to `.maybeSingle()` on the module query to prevent throwing when no data is found
- Also fix the course query the same way
- Add `isError` tracking

### 3. Update Module Header Section
Replace the current simple title/description with a richer header:
- **h1**: Module title
- **Week badge**: "Week N" if `week_number` is set
- **Description**: paragraph if set
- **Learning objectives**: bulleted list if the array has items

### 4. Add Empty State for Generated Content
Below the module info, when `contents` is empty, show a centered empty state with:
- A `FileText` icon in muted color
- "No content generated yet" heading
- Subtext: "Use the buttons below to generate content for this module."
- Still show the `ContentTabs` below so users can click Generate

### Files Modified
- `src/pages/ModuleDetail.tsx` — fix queries, add header, add empty state
- Database migration — add `week_number` and `learning_objectives` columns

