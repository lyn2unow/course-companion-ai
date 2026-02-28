

# Phase 4: Module Content Generation & Review

## Overview
The secondary user flow per the project spec is **Module Content Generation & Review** (Flow 2). This transforms the Course Detail page from a placeholder into an interactive hub where instructors can create modules, then generate AI-powered content (lecture notes, key terms, discussion prompts) for each module. This is the core value proposition of the product.

## Step 1: Enhance Course Detail Page
Upgrade `CourseDetail.tsx` from a read-only placeholder to an interactive course management hub:
- Add "Add Module" button that opens a dialog to create new modules (title + description)
- Allow reordering modules with up/down buttons
- Allow deleting modules with confirmation
- Each module card becomes expandable/clickable to reveal content generation options
- Add course info summary section (teaching philosophy, source hierarchy)

## Step 2: Create Module Detail View
Create `src/pages/ModuleDetail.tsx` at route `/courses/:courseId/modules/:moduleId`:
- Show module title and description (editable inline)
- Display tabs for different content types: Lecture Notes, Key Terms, Discussion Prompts
- Each tab shows existing generated content or an empty state with "Generate" CTA
- Content cards show approval status, creation date, and actions (edit, regenerate, approve, delete)

## Step 3: Build the AI Content Generation Edge Function
Create a backend function `supabase/functions/generate-content/index.ts` that:
- Accepts: module_id, content_type (lecture_notes, key_terms, discussion_prompt), course context
- Fetches the course's teaching philosophy, source hierarchy, and module info
- Calls an AI model (Gemini 2.5 Flash -- fast, good for content generation) with a structured prompt
- Returns the generated content text
- The function uses the LOVABLE_API_KEY secret (already configured) to access Lovable AI models

## Step 4: Create Content Generation UI Components
Build components in `src/components/content-generation/`:
- **GenerateContentButton** -- triggers generation with loading state and content type selection
- **ContentCard** -- displays generated content with markdown-like formatting, approval toggle, edit mode
- **ContentEditor** -- inline text editor for reviewing and modifying AI-generated content
- **ContentTabs** -- tab layout for the three content types within a module

## Step 5: Wire Up Data Flow
- On "Generate" click: call the edge function, show loading spinner, save result to `generated_content` table
- Display all generated content for a module, grouped by content_type
- Allow editing content inline and saving updates
- Toggle `is_approved` to mark content as reviewed
- Allow regeneration (creates a new version, keeps the old one)
- Allow deletion of unwanted content

## Step 6: Add Module Management to Course Detail
- CRUD operations for modules directly from the Course Detail page
- Add Module dialog with title and optional description
- Edit module title/description inline
- Delete module with confirmation (cascades to generated content)
- Reorder modules with sort_order updates

## Step 7: Update Navigation
- Add route `/courses/:courseId/modules/:moduleId` to `App.tsx`
- Module cards on Course Detail link to Module Detail
- Breadcrumb navigation: Dashboard > Course Name > Module Name
- Back buttons at each level

## Technical Details

### New Files
- `src/pages/ModuleDetail.tsx` -- module detail with content tabs
- `src/components/content-generation/ContentTabs.tsx` -- tab layout for content types
- `src/components/content-generation/ContentCard.tsx` -- individual content display
- `src/components/content-generation/ContentEditor.tsx` -- inline editing
- `src/components/content-generation/GenerateContentButton.tsx` -- generation trigger
- `src/components/modules/AddModuleDialog.tsx` -- create module form
- `src/components/modules/ModuleCard.tsx` -- enhanced module card for course detail
- `supabase/functions/generate-content/index.ts` -- AI content generation edge function

### Modified Files
- `src/pages/CourseDetail.tsx` -- add module management (add, reorder, delete)
- `src/App.tsx` -- add `/courses/:courseId/modules/:moduleId` route

### Edge Function: generate-content
```text
POST /generate-content
Body: { moduleId, contentType, courseId }
Auth: Bearer token (user's session JWT)

Flow:
1. Verify auth, fetch course + module data
2. Build prompt with course context (philosophy, hierarchy, module title)
3. Call Lovable AI (Gemini 2.5 Flash) via LOVABLE_API_KEY
4. Return { content: string }
```

### AI Prompt Structure
The edge function builds context-aware prompts using:
- Course name, description, teaching philosophy
- Source material hierarchy preferences
- Module title and description
- Content type-specific instructions (e.g., "Generate comprehensive lecture notes" vs "Extract 15-20 key terms with definitions")

### No Database Changes Required
All tables are already in place: `modules`, `generated_content` with proper RLS policies.

## Outcome
Instructors can manage modules within a course and generate AI-powered lecture notes, key terms, and discussion prompts for each module. They can review, edit, approve, or regenerate content -- establishing the core AI-assisted workflow that differentiates CourseForge.
