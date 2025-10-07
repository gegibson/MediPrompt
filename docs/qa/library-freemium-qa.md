# Library Freemium Prompt QA Checklist

## Prerequisites
- Stripe test mode keys configured; ability to toggle subscription status for the test user.
- Supabase auth working in the environment under test.
- Dev server running at `http://localhost:3001`.
- Optional: browser profiles for logged-out vs logged-in scenarios.

## Scenarios

### 1. Logged-out visitor on premium prompt
- Navigate to `/library/medication-management-new-inhaler` in a fresh session.
- Expect gradient preview, centered lock overlay, banner + header subscribe CTAs, and visible example/usage/related sections.
- Click subscribe → auth modal should appear (no checkout yet).

### 2. Logged-in, non-subscriber
- Sign in via auth modal or `/login`.
- Revisit the same premium prompt.
- Confirm paywall stays active with overlay + CTAs (“Subscribe to Copy”).
- Trigger overlay CTA → Stripe checkout opens directly.

### 3. Checkout success
- In Stripe test checkout, use VISA `4242 4242 4242 4242`, any future expiry, CVC `123`, ZIP `94105`.
- After payment, verify redirect to prompt with `checkout=success` query.
- Overlay disappears, full prompt unlocks, copy button works, success alert shows once.

### 4. Checkout cancel
- Restart checkout then cancel on Stripe side.
- Back on prompt, ensure informative banner (“Checkout was cancelled…”) appears and paywall remains.

### 5. Expired/lapsed subscription
- In Stripe, set subscription to incomplete/paused (or schedule cancellation) for the user.
- Reload premium prompt → overlay copy switches to “Reactivate subscription.”
- Completing checkout reactivates subscription and removes lock.

### 6. `/api/me` resiliency
- Temporarily block `/api/me` (network tab or server toggle) while logged in.
- Load premium prompt → overlay stays, amber error card displays retry messaging.
- Restore endpoint and click “Retry” → overlay clears once status resolves.

### 7. Free prompt sanity
- Visit `/library/primary-care-intake-checklist` logged in and logged out.
- Confirm prompt is fully accessible (no overlay), copy button works, example section visible.

### 8. Analytics (optional when enabled)
- With analytics configured, expect `prompt_view`, `prompt_locked_view`, `subscription_cta_click`, `library_prompt_copied`, `library_quick_launch` during steps above.

## Regression Checks
- Toggle between prompts rapidly to ensure no stale subscription state flashes unlocked content.
- Dismiss the premium banner and refresh; it should remain hidden for that session until checkout completes.
- Verify copy button success toast + quick launch panel only appear when prompt unlocked.

## References
- Implementation details: `docs/library/prompt-freemium-roadmap.md` (Status section).
- Automated accessibility: `tests/accessibility/prompt-a11y.test.ts` (requires `npm run dev`).
