

## Plan: Create `CourseObjectives.tsx`

### What it does
A new course setup wizard step showing AI-extracted learning objectives as editable line items. Instructors can add, edit, or remove objectives before continuing.

### Implementation

**Create `src/components/course-setup/CourseObjectives.tsx`**

Single file creation matching the existing wizard step pattern (same layout as `CoursePhilosophy.tsx`):

- **Props**: `objectives: string[]`, `isExtracting: boolean`, `onNext`, `onBack`
- **Loading state**: When `isExtracting` is true, show a centered spinner with "Reading your syllabus..." message and Sparkles icon
- **Extracted state**: Show note with Sparkles icon: "Extracted from your syllabus — review and edit as needed"
- **Manual state**: If no objectives were extracted, show: "No syllabus uploaded. Add your learning objectives manually."
- **Editable list**: Each objective is an `Input` with an `X` button to remove (hidden when only 1 item)
- **Add button**: Ghost button with Plus icon to append a new empty objective
- **Navigation**: Back/Next buttons in the standard `flex justify-between pt-4` layout
- **On next**: Trims and filters empty strings before passing to `onNext`

The JSX in the user's message was stripped of tags, so I'll reconstruct them properly from the described behavior and the existing component patterns.

