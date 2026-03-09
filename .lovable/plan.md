

## Plan: Add Inline Material Type Editing

### What changes
Make the material type badge in each material row clickable, turning it into a Select dropdown so users can change the type without deleting and re-uploading.

### Implementation

**1. `MaterialsList.tsx`** — Add editing capability
- Add `onUpdateType` callback prop: `(id: string, newType: string) => void`
- Add `materialTypes` prop: `{ value: string; label: string }[]` (passed from parent)
- Replace the static `Badge` with a compact `Select` dropdown (same visual size as badge)
- On change, call `onUpdateType(id, newValue)`
- Show a subtle loading state per-row while saving

**2. `MaterialsManager.tsx`** — Wire up the update handler
- Add `handleUpdateType(id: string, newType: string)` that runs:
  ```ts
  await supabase.from("course_materials").update({ material_type: newType }).eq("id", id);
  queryClient.invalidateQueries({ queryKey: ["course_materials", courseId] });
  toast({ title: "Material type updated" });
  ```
- Pass `materialTypes` and `handleUpdateType` to `MaterialsList`

### UX
- The Select replaces the Badge inline — no dialog needed
- Compact styling to match existing row layout
- Includes all material types (defaults + custom source hierarchy entries)

