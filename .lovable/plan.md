

# Render Markdown in Content Cards

## Overview
Install `react-markdown` and update `ContentCard` to render formatted markdown by default, with a toggle to switch to raw edit mode.

## Changes

### 1. Install `react-markdown`
Add `react-markdown` package. The project already has `@tailwindcss/typography` (used in devDependencies) and `prose` classes are already applied on line 100 of ContentCard — so typography styling will work out of the box.

### 2. Update `ContentCard.tsx`
- Replace `editing` boolean state with a `mode` state: `"preview"` (default) | `"edit"`
- Add two small toggle buttons (Eye icon for Preview, Pencil icon for Edit) in the header, styled as a toggle group or simple buttons with active state highlighting
- **Preview mode**: render `item.content` via `<ReactMarkdown>` inside a `prose prose-sm` container. Remove `whitespace-pre-wrap` (markdown handles spacing).
- **Edit mode**: show the existing `ContentEditor` with textarea + Save/Cancel. On save or cancel, switch back to preview mode.
- All action buttons (copy, regenerate, export, delete, approval toggle) remain visible in both modes.

### 3. Files
- **`package.json`** — add `react-markdown`
- **`src/components/content-generation/ContentCard.tsx`** — import ReactMarkdown, replace editing boolean with mode state, add preview/edit toggle buttons, render markdown in preview mode

