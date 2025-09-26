# Manual QA Checklist (Stage 6)

This checklist validates the MVP flows end-to-end. Run it on staging and production before launch.

## Prep
- Use a fresh browser profile or private window.
- Ensure env is configured: Supabase, Stripe (test), Plausible (optional on staging).
- Have Stripe test card handy: 4242 4242 4242 4242, future expiry, any CVC/ZIP.

## A. Landing Page
- Loads with branding, headline, and CTA buttons.
- Preview cap works:
  - Generate 1st preview → output renders, counter updates, event: `landing_preview_generated`.
  - Generate 2nd preview → output renders, counter updates, event again.
  - 3rd attempt blocked → banner visible, event: `landing_preview_limit_hit`.
- PHI guard:
  - Type “my name is John Doe” → inline red warning appears.
  - Submit triggers `wizard_input_flagged` with `source=landing`.
- Auth modal opens from “Sign in” → mode switching, validation, and error messages render.
- “Use Wizard” and “Skip to Wizard” routes to `/wizard`.

## B. Auth Flows (Modal)
- Sign up:
  - Open modal → switch to Sign up → create account with test email/password.
  - Success event: `auth_modal_success` (mode=signup). Auth cookie persists on refresh.
- Sign in:
  - Sign out → reopen modal → login with same account.
  - Success event: `auth_modal_success` (mode=login).
- Reset password:
  - Trigger reset with a valid email → success message and event: `auth_modal_success` (mode=reset).

## C. Wizard (Free + Paywall)
- Anonymous:
  - Open `/wizard` while logged out → heading shows Plan: Free (anon).
  - Fill Topic and Context → submit → prompt appears → event: `wizard_prompt_generated`.
  - Submit again → blocked, `wizard_prompt_blocked` (reason=anon-login), auth modal opens.
- Logged in, no subscription:
  - Log in → badge shows Plan: Free (account).
  - Submit once → consumes free preview, event: `wizard_free_preview_consumed`.
  - Submit again → paywall visible, event: `wizard_paywall_viewed`.
  - Click Subscribe CTA → event: `wizard_paywall_cta_click`.
- PHI guard:
  - Enter a date like 03/14/2020 or 9+ digit number in Topic/Context → inline red warning appears.
  - Submit triggers `wizard_input_flagged` with counts for each field.

## D. Checkout + Subscription
- Create checkout session → redirect to Stripe test checkout.
- Complete payment with test card → redirect back to `/wizard?checkout=success&session_id=...`.
- Client calls `POST /api/subscribe/confirm` → status badge updates to Plan: Unlimited.
- Run another submit → unlimited prompts generate, no paywall.
- Cancel test subscription from Stripe Dashboard → webhook sets is_subscriber=false (optional).

## E. Sign out
- From Wizard and Landing → Sign out works; event: `auth_signed_out` with `source`.

## F. Security Headers (Production)
- Response headers include:
  - Content-Security-Policy (connect-src includes your Supabase origin)
  - Strict-Transport-Security
  - Referrer-Policy
  - X-Content-Type-Options
  - Permissions-Policy
- No CSP violations in console for normal usage.

## G. SEO/OG
- `/wizard` has specific title/description.
- Sharing `/wizard` shows OG image from `public/og-wizard.svg`.

## Event Verification Tips
- If Plausible is enabled, check the real-time dashboard for events listed above.
- If Plausible is disabled, open DevTools → Network tab to confirm requests for API routes during flows; app logs warnings only on errors.

## Record Results
- Note PASS/FAIL per section and capture screenshots of any issues.
- File bugs with route, steps, expected vs actual, and console/network excerpts.
