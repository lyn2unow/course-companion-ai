

# Generate Content Panel Redesign

## Overview
Replace the current tab-based layout with a 4-button action panel and enhanced content cards. Add "Reading Guide" as a fourth content type. No database changes needed — the existing `generated_content` table already has `content`, `content_type`, and `is_approved` which map to the requested functionality.

## Changes

### 1. Replace `ContentTabs.tsx` with `GenerateContentPanel.tsx`
New component with a grid of 4 styled action buttons:
- **Lecture Notes** (FileText icon)
- **Key Terms & Glossary** (BookOpen icon)
- **Discussion Prompts** (MessageSquare icon)
- **Reading Guide** (BookMarked icon)

Each button uses the yellow accent style. When clicked: spinner on that button, all 4 disabled. Below the buttons, all generated content renders as cards (no tabs — flat list grouped or sorted by creation date).

### 2. Update `ContentCard.tsx`
Add to each card:
- Header showing content type label (e.g. "Lecture Notes") instead of just the timestamp
- Amber "AI Generated — Review Before Use" badge (shown when `!is_approved`)
- "Copy to Clipboard" button (already exists via ExportMenu, but add a direct button)
- Keep existing: edit, approve toggle (renamed to "Mark as Reviewed"), regenerate, delete, export

### 3. Update `ModuleDetail.tsx`
- Import new `GenerateContentPanel` instead of `ContentTabs`
- Pass same props — no logic changes needed

### 4. Update `generate-content` edge function
- Add `reading_guide` prompt template alongside existing lecture_notes, key_terms, discussion_prompt

### Files
- **New**: `src/components/content-generation/GenerateContentPanel.tsx`
- **Modified**: `src/components/content-generation/ContentCard.tsx` — enhanced header with content type, amber badge, copy button
- **Modified**: `src/pages/ModuleDetail.tsx` — swap ContentTabs for GenerateContentPanel
- **Modified**: `supabase/functions/generate-content/index.ts` — add reading_guide prompt
- **Deleted** (or unused): `src/components/content-generation/ContentTabs.tsx` replaced by new panel

