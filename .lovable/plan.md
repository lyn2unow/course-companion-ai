

# Phase 2: Design System Implementation

## Overview
Update the color system, typography, and component styling to match the project spec: dark navy background (`hsl(215, 39%, 19%)`) for landing/auth pages, light background for the dashboard, gold accent (`hsl(45, 100%, 52%)`), and Inter font throughout.

## Step 1: Add Google Fonts to index.html
- Import Inter (400, 500, 600, 700) via Google Fonts link tag
- Update the page title and meta tags from "Lovable App" to the product name (we'll use "CourseForge" as a working title)

## Step 2: Update CSS Variables in src/index.css
Remap the `:root` (light theme for dashboard) CSS variables:
- `--background`: white (0 0% 100%) -- stays the same for dashboard
- `--foreground`: dark text (0 0% 20%) -- spec text color #333
- `--primary`: dark navy (215 39% 19%) -- #1e2d43
- `--primary-foreground`: white (0 0% 100%)
- `--accent`: gold (45 100% 52%) -- #ffc20a
- `--accent-foreground`: dark navy (215 39% 19%)
- Update `--ring` to gold for focus states
- Add a custom `--navy` variable for direct use on landing/auth backgrounds
- Update sidebar variables to use navy tones

Also add a `.dark` override for potential future dark mode.

## Step 3: Update Tailwind Config
- Add `fontFamily` config with `inter: ['Inter', 'sans-serif']` and `mono: ['JetBrains Mono', 'monospace']`
- Add custom color `navy` mapped to the dark navy HSL value for direct usage (e.g., `bg-navy`)
- Add custom color `gold` mapped to the accent for convenience

## Step 4: Update Button Component Variants
Customize `src/components/ui/button.tsx`:
- `default` variant: gold background (`bg-accent`) with dark navy text, hover darkens slightly
- `secondary` variant: navy background with white text
- `outline` variant: navy border with navy text, gold hover
- `ghost` and `link` variants: adjust to use navy/gold appropriately
- Ensure accessible focus rings use the gold accent

## Step 5: Restyle Auth Pages (Login, Signup, ForgotPassword, ResetPassword)
- Change background from `bg-primary` to `bg-navy` (the dark navy)
- Update card styling for proper contrast on dark backgrounds
- Style buttons with the gold accent variant
- Add the product name/logo at the top of each auth form

## Step 6: Update Dashboard Layout
- Keep the light `bg-background` for the main dashboard area
- Update the header to use navy background with white text and gold accent for actions
- Prepare the layout structure for a future sidebar (Phase 3)

## Step 7: Create Shared Layout Components
- **AppHeader**: Reusable header component with logo, nav, and user menu
- **PageContainer**: Wrapper with consistent max-width and padding (following the 4px/8px grid)
- **AuthLayout**: Shared layout for login/signup/reset pages (dark navy background, centered card)

## Technical Details

### CSS Variable Changes (src/index.css)
```
--primary: 215 39% 19%        (navy)
--primary-foreground: 0 0% 100%
--accent: 45 100% 52%         (gold)  
--accent-foreground: 215 39% 19%
--foreground: 0 0% 20%        (#333)
--ring: 45 100% 52%           (gold focus)
--muted-foreground: 0 0% 40%  (softer gray)
```

### Tailwind Config Additions
```
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
colors: {
  navy: 'hsl(215, 39%, 19%)',
  gold: 'hsl(45, 100%, 52%)',
}
```

### Files to Create
- `src/components/layout/AuthLayout.tsx` -- dark navy wrapper with centered card
- `src/components/layout/AppHeader.tsx` -- dashboard header with logo + nav
- `src/components/layout/PageContainer.tsx` -- max-width + padding wrapper

### Files to Modify
- `index.html` -- fonts + title
- `src/index.css` -- CSS variables
- `tailwind.config.ts` -- fonts + custom colors
- `src/components/ui/button.tsx` -- variant colors
- `src/pages/Login.tsx` -- use AuthLayout
- `src/pages/Signup.tsx` -- use AuthLayout
- `src/pages/ForgotPassword.tsx` -- use AuthLayout
- `src/pages/ResetPassword.tsx` -- use AuthLayout
- `src/pages/Dashboard.tsx` -- use AppHeader
- `src/pages/Index.tsx` -- placeholder with dark navy hero

## Outcome
After this phase, all pages share a consistent visual identity: dark navy landing/auth sections with gold CTAs, clean light dashboard, Inter typography, and reusable layout components ready for the course setup wizard in Phase 3.
