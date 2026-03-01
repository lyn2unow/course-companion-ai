

# Phase 5: Polish & Accessibility

## Overview
Add micro-interactions, error boundaries, lazy loading, skeleton loaders, and accessibility improvements across the application. No new features -- this is about making the existing experience feel polished and professional.

## 1. Error Boundary Component
Create `src/components/ErrorBoundary.tsx`:
- Class component that catches render errors
- Shows a friendly "Something went wrong" message with a "Try again" button that reloads the page
- Wrap the main `<Routes>` in App.tsx with it

## 2. Lazy Loading & Code Splitting
Update `src/App.tsx`:
- Use `React.lazy()` for all page components (Dashboard, CourseSetup, CourseDetail, ModuleDetail, Login, Signup, ForgotPassword, ResetPassword)
- Wrap lazy routes in `<Suspense>` with a centered spinner fallback
- Keep Index (landing page) eagerly loaded for fast first paint

## 3. Skeleton Loaders
Replace raw `<Loader2>` spinners with content-aware skeletons:
- **Dashboard**: Create a `CourseCardSkeleton` showing 4 placeholder cards in the grid while courses load
- **CourseDetail**: Skeleton for course header + 3 module card placeholders
- **ModuleDetail**: Skeleton for module header + content tabs area
- Use the existing `Skeleton` component from `src/components/ui/skeleton.tsx`

## 4. Staggered List Animations
Add CSS-based staggered fade-in animations (no Framer Motion needed -- keep the bundle small):
- Add `animate-fade-in` keyframes to `tailwind.config.ts` (fade + translateY)
- Apply staggered `animation-delay` via inline styles on course cards and module cards
- Add `transition-shadow` and `hover:shadow-md` on interactive cards (already partially done)

## 5. Page Transition Wrapper
Create a lightweight `src/components/layout/PageTransition.tsx` component:
- Wraps page content with a `animate-fade-in` class on mount
- Simple CSS-only approach: opacity 0 to 1 + slight translateY
- Apply to all page components (Dashboard, CourseDetail, ModuleDetail, CourseSetup)

## 6. Accessibility Fixes
Across all pages:
- **Heading hierarchy**: Ensure each page has exactly one `<h1>`, sections use `<h2>`, subsections `<h3>`
- **Focus management**: Add `focus-visible:ring-2 focus-visible:ring-ring` to all interactive elements (already handled by shadcn button, but verify cards/links)
- **Landmark regions**: Wrap main content in `<main>`, header in `<header>` (already done), add `role="navigation"` to breadcrumbs
- **Form labels**: Verify all inputs have associated `<Label>` elements (already done in auth pages and course setup)
- **Alt text**: Add `aria-label` to icon-only buttons (reorder up/down, delete)
- **Skip navigation**: Add a "Skip to main content" link at the top of AppHeader
- **Color contrast**: Verify `text-white/70` on navy background meets 4.5:1 ratio (it does: white at 70% opacity on #1e2d43 is ~5.2:1)

## 7. Interactive Feedback
- **Button press**: Add `active:scale-[0.98]` to the Button component for tactile feedback
- **Toast positioning**: Ensure toasts don't overlap mobile navigation
- **Loading buttons**: Already show loading text -- add a subtle spinner icon alongside text on all submit buttons

## 8. NotFound Page Polish
Update `src/pages/NotFound.tsx`:
- Use the navy background to match the landing page aesthetic
- Add a "Back to Dashboard" link for authenticated users
- Improve visual hierarchy

## Technical Details

### New Files
- `src/components/ErrorBoundary.tsx` -- React error boundary with friendly UI
- `src/components/layout/PageTransition.tsx` -- CSS fade-in wrapper

### Modified Files
- `src/App.tsx` -- lazy imports, Suspense, ErrorBoundary wrapper
- `tailwind.config.ts` -- add fade-in keyframe + animation
- `src/components/ui/button.tsx` -- add `active:scale-[0.98]` press feedback
- `src/pages/Dashboard.tsx` -- skeleton loader, staggered animation, PageTransition
- `src/pages/CourseDetail.tsx` -- skeleton loader, staggered animation, PageTransition, aria-labels on icon buttons
- `src/pages/ModuleDetail.tsx` -- skeleton loader, PageTransition
- `src/pages/CourseSetup.tsx` -- PageTransition wrapper
- `src/pages/NotFound.tsx` -- visual polish with navy theme
- `src/components/layout/AppHeader.tsx` -- skip-to-content link
- `src/components/modules/ModuleCard.tsx` -- aria-labels on reorder/delete buttons

### Tailwind Config Additions
```text
keyframes: {
  "fade-in": {
    "0%": { opacity: "0", transform: "translateY(8px)" },
    "100%": { opacity: "1", transform: "translateY(0)" }
  }
}
animation: {
  "fade-in": "fade-in 0.3s ease-out forwards"
}
```

### No Database Changes Required
This phase is entirely frontend polish.

## Outcome
The app feels responsive and polished: pages fade in smoothly, loading states show content-aware skeletons, errors are caught gracefully, all interactive elements are keyboard accessible, and the heading hierarchy is correct for screen readers.
