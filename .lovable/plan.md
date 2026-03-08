

# Fix ResetPassword Stuck on "Verifying recovery token..."

## Root Cause
The component checks `window.location.hash.includes("type=recovery")` but by the time React mounts, the Supabase client has already consumed and removed the hash fragment. The `PASSWORD_RECOVERY` event may also fire before the `onAuthStateChange` listener is registered, so `ready` never becomes `true`.

## Changes — `src/pages/ResetPassword.tsx`

1. **Add `expired` state** alongside `ready` to track timeout
2. **Check for existing session on mount** — if the user already has a session (meaning Supabase already processed the recovery token), set `ready = true` immediately via `getSession()`
3. **Keep the `onAuthStateChange` listener** for `PASSWORD_RECOVERY` event as a fallback
4. **Add 5-second timeout** — if neither the session check nor the event fires, set `expired = true`
5. **Show error card when expired** — "Reset link expired or invalid" with a `Link` to `/forgot-password`
6. **Redirect to `/dashboard`** on success instead of `/login` (user is already authenticated after password update)
7. **Clean up** both the subscription and the timeout on unmount

Single file change, ~70 lines total.

