

# Phase 3: Initial Course Setup & Customization

## Overview
Build a multi-step course creation wizard as the primary user flow. After signing in, users land on the dashboard where they can click "Create New Course" to enter a guided setup process.

## Step 1: Create the Course Setup Page & Route
- Add `/courses/new` route in `App.tsx` (protected)
- Create `src/pages/CourseSetup.tsx` as a multi-step wizard container
- Track current step in local state (steps 1-4)
- Show a progress indicator at the top

## Step 2: Build Wizard Step Components
Create individual step components in `src/components/course-setup/`:

**Step 1 - Basic Info** (`CourseBasicInfo.tsx`)
- Course Name (required, text input)
- Description (textarea)
- Institution (text input)
- Semester (text input, e.g. "Spring 2026")
- Form validation with zod

**Step 2 - Teaching Philosophy** (`CoursePhilosophy.tsx`)
- Teaching Philosophy (textarea, optional)
- Source Material Hierarchy (sortable list of items like "Statutes", "Exam Handbook", "Textbook")
- Add/remove/reorder capability using simple up/down buttons

**Step 3 - File Upload** (`CourseMaterials.tsx`)
- Upload syllabus, lecture notes, textbook references
- File type selection (syllabus, lecture_notes, textbook, other)
- Show upload progress and file list
- Uses Supabase Storage (requires creating a `course-materials` bucket)
- Files are optional at setup -- users can add later

**Step 4 - Review & Confirm** (`CourseReview.tsx`)
- Summary of all entered information
- List of uploaded files
- "Create Course" button to finalize

## Step 3: Create Storage Bucket
- Create a `course-materials` storage bucket via migration
- Add RLS policy so users can only access their own files (path pattern: `{user_id}/{course_id}/...`)

## Step 4: Implement Data Persistence
- On final confirmation, insert into `courses` table
- Upload files to storage and insert metadata into `course_materials` table
- Auto-generate initial modules from course outline (placeholder -- actual AI generation is a later phase)
- Show success toast and redirect to dashboard

## Step 5: Update Dashboard
- Show a list of user's courses (fetched from `courses` table)
- Each course shown as a card with name, institution, semester, module count
- "Create New Course" button links to `/courses/new`
- Empty state with clear CTA when no courses exist

## Step 6: Add Course Detail Route
- Add `/courses/:id` route (protected) as a placeholder page
- Show course name, description, and module list
- This becomes the hub for Phase 4+ features (content generation, quizzes, etc.)

## Technical Details

### New Files
- `src/pages/CourseSetup.tsx` -- wizard container with step state
- `src/components/course-setup/CourseBasicInfo.tsx` -- step 1 form
- `src/components/course-setup/CoursePhilosophy.tsx` -- step 2 form
- `src/components/course-setup/CourseMaterials.tsx` -- step 3 file upload
- `src/components/course-setup/CourseReview.tsx` -- step 4 summary
- `src/components/course-setup/StepIndicator.tsx` -- progress bar
- `src/pages/CourseDetail.tsx` -- course detail placeholder

### Modified Files
- `src/App.tsx` -- add `/courses/new` and `/courses/:id` routes
- `src/pages/Dashboard.tsx` -- course list with cards and empty state

### Database Changes
- Create `course-materials` storage bucket with owner-based RLS

### Validation Schema (zod)
```text
courseName: string, required, max 200 chars
description: string, optional, max 2000 chars
institution: string, optional, max 200 chars
semester: string, optional, max 100 chars
teachingPhilosophy: string, optional, max 5000 chars
sourceHierarchy: array of strings
```

### State Management
- Wizard state held in `CourseSetup.tsx` via `useState`
- Each step receives data + setter as props
- No server save until final confirmation (keeps it simple)
- React Query for fetching courses on dashboard

## Outcome
Users can create courses through a guided 4-step wizard, upload materials, and see their courses on the dashboard. This establishes the core data foundation for all subsequent AI-powered features.

