

# Phase 1: Database & Authentication Foundation

## Step 1: Enable Lovable Cloud
Connect the project to Lovable Cloud to get Supabase (database, auth, storage, edge functions) without needing an external account.

## Step 2: Create Database Tables
Set up the core schema with proper relationships:

- **profiles** — Stores user display name, avatar, institution, role/title. Auto-created on signup via trigger. Linked to `auth.users` with cascade delete.
- **user_roles** — Separate roles table (admin, instructor, user) using an `app_role` enum. Prevents privilege escalation.
- **subscriptions** — Tracks Stripe subscription status, plan type, and billing period for each user.
- **courses** — Stores course name, description, institution, semester, teaching philosophy, and source material hierarchy. Owned by user.
- **course_materials** — Uploaded syllabi, lecture notes, textbook references linked to a course. Stores file metadata and Supabase Storage path.
- **modules** — Individual modules/units within a course, with title, order, and status.
- **generated_content** — AI-generated lecture notes, key terms, discussion prompts stored per module, with content type and approval status.
- **quizzes** — Quiz/assignment definitions per module, including parameters (question count, types) and export format.
- **quiz_questions** — Individual questions with answer options, correct answer, and explanations.
- **assignments** — Assignment definitions with rubric criteria per module.
- **grading_sessions** — Tracks AI grading runs — links student submissions to assignments, stores proposed grade and feedback.
- **discussion_analyses** — Stores discussion analysis parameters and kudos criteria per module.

## Step 3: Enable Row-Level Security (RLS)
All user-facing tables get RLS enabled with policies ensuring:
- Users can only read/update/delete **their own** data
- A `has_role()` security definer function for safe role checks without recursion
- Admin role holders can access all data when needed

## Step 4: Create Auto-Profile Trigger
A database trigger that automatically creates a `profiles` row when a new user signs up via `auth.users`, pulling display name from signup metadata.

## Step 5: Configure Authentication
- Enable **Email/Password** authentication
- Set up the auth flow pages: **Login**, **Signup**, **Forgot Password**, and **Reset Password** (`/reset-password` route)
- Create an **AuthContext** provider to manage session state across the app
- Add **protected route** wrapper that redirects unauthenticated users to login
- Wire up `onAuthStateChange` listener for session management

## Step 6: Create Basic Auth UI Pages
Minimal, functional auth pages styled with the project's design system (dark navy for landing areas, clean forms):
- **Login page** (`/login`) — Email + password form with "Forgot password?" link
- **Signup page** (`/signup`) — Email + password + display name form
- **Forgot password page** (`/forgot-password`) — Email input to trigger reset
- **Reset password page** (`/reset-password`) — New password form, handles recovery token

## Step 7: Update App Routing
- Add all auth routes to the router
- Wrap dashboard routes (to be built in Phase 2) with the protected route component
- Redirect authenticated users away from login/signup pages

## Outcome
After this phase, users can sign up, log in, reset passwords, and have their profile auto-created. All database tables are in place with proper security, ready for the UI and AI features in subsequent phases.

