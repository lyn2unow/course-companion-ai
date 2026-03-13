

## Plan: Wire Objectives Step into Course Setup + Update Module Insert

### Changes

**1. `src/pages/CourseSetup.tsx`** — Add Objectives as step 5 (post-save)

- Import `CourseObjectives`
- Update `STEP_LABELS` to 5 steps: `["Basic Info", "Philosophy", "Materials", "Review", "Objectives"]`
- Add state: `isExtracting`, `objectives`, `courseIdForExtraction`
- Rewrite `handleSubmit`: after saving course + uploading files, trigger `parse-content` for each file, then move to step 5. If a syllabus was uploaded, wait 3s then call `extract-objectives` to populate objectives
- Add `handleFinish`: navigates to the new course detail page with a toast
- Update step rendering: `StepIndicator totalSteps=5`, Review stays at step 4 (triggers save), new Objectives step at step 5
- Objectives step calls `handleFinish` on next

Flow: Basic Info → Philosophy → Materials → Review [save] → Objectives → Course Detail

**2. `src/pages/CourseDetail.tsx`** — Add `learning_objectives: []` to module insert

- Line 89: add `learning_objectives: [],` to the insert object in `handleAddModule`

### No database changes needed

