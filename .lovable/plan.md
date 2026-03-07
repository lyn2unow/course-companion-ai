

# Course Content Import & Export System

## Problem
The AI content generator has no source material to work from. The current course setup only allows file uploads during initial creation, but there's no way to manage content after setup, and the uploaded files aren't being fed to the AI. We need a robust import/export system that gives the AI context and lets instructors move content between LMS platforms.

## What We'll Build

### 1. Course Materials Management Hub
Add a **"Course Materials"** section to the Course Detail page (`CourseDetail.tsx`) where instructors can manage source content at any time -- not just during initial setup.

**Import methods:**
- **Copy/Paste text** -- paste syllabus content, lecture notes, or any text directly
- **File upload** -- PDF, DOCX, TXT, XLS/XLSX, QTI (Canvas quiz format)
- Each material gets a type label (Syllabus, Lecture Notes, Textbook, Quiz Bank, Spreadsheet, Other)

### 2. Content Parsing Edge Function
Create a `parse-content` backend function that extracts text from uploaded files so the AI can use it:
- **PDF** -- extract text using pdf-parse
- **DOCX** -- extract text from Word documents
- **XLS/XLSX** -- parse spreadsheet data into structured text
- **QTI (.zip)** -- parse Canvas quiz XML into structured question data
- **TXT** -- read directly
- Store the extracted text in a new `extracted_text` column on the `course_materials` table

### 3. Feed Source Materials to AI
Update the `generate-content` edge function to:
- Fetch all course materials with extracted text
- Include the most relevant material content in the AI prompt context
- This gives the AI actual course content to generate from (not just titles)

### 4. Content Export System
Add export capabilities to generated content so instructors can use it in Canvas/Blackboard:
- **Export as DOCX** -- lecture notes and key terms as Word documents
- **Export as PDF** -- formatted content for printing/sharing
- **Export as QTI** -- quiz questions in IMS QTI 1.2 format (compatible with Canvas and Blackboard)
- **Export as CSV** -- key terms, grades, or tabular data
- **Copy to clipboard** -- quick copy of any generated content

### 5. Export Edge Function
Create an `export-content` backend function that generates downloadable files:
- Builds QTI XML packages for quiz export
- Generates simple DOCX/CSV from content
- Returns downloadable file data

## Technical Details

### Database Migration
Add `extracted_text` column to `course_materials`:
```text
ALTER TABLE course_materials ADD COLUMN extracted_text text;
```

### New Files
- `src/components/course-materials/MaterialsManager.tsx` -- main materials hub with upload + paste UI
- `src/components/course-materials/PasteContentDialog.tsx` -- dialog for pasting text content
- `src/components/course-materials/MaterialsList.tsx` -- list of uploaded materials with actions
- `src/components/content-generation/ExportMenu.tsx` -- dropdown menu with export format options
- `supabase/functions/parse-content/index.ts` -- extracts text from uploaded files
- `supabase/functions/export-content/index.ts` -- generates downloadable export files (QTI, CSV, DOCX)

### Modified Files
- `src/pages/CourseDetail.tsx` -- add Materials section with tabs (Modules | Materials)
- `src/pages/ModuleDetail.tsx` -- add export buttons to content cards
- `src/components/content-generation/ContentCard.tsx` -- add export action menu
- `supabase/functions/generate-content/index.ts` -- include extracted material text in AI prompts

### Supported Import Formats
| Format | Extension | Use Case |
|--------|-----------|----------|
| Plain Text | .txt | Direct content |
| PDF | .pdf | Syllabi, textbooks |
| Word | .docx | Lecture notes, assignments |
| Excel | .xls, .xlsx | Grade data, rubrics |
| QTI | .zip (QTI XML) | Canvas/Blackboard quiz banks |
| Pasted Text | n/a | Quick content entry |

### Supported Export Formats
| Format | Content Type | LMS Compatibility |
|--------|-------------|-------------------|
| QTI 1.2 | Quizzes | Canvas, Blackboard, Moodle |
| CSV | Key terms, grades | Universal |
| DOCX | Lecture notes, prompts | Universal |
| Clipboard | Any text | Universal |

### How It Fits Together
1. Instructor uploads a PDF syllabus to Course Materials
2. Backend function extracts text and stores it
3. When instructor clicks "Generate Lecture Notes" on a module, the AI prompt now includes the actual syllabus content
4. AI generates relevant, contextual lecture notes based on real course material
5. Instructor reviews, edits, approves, then exports as DOCX or QTI for Canvas

