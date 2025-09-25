# Stage 1 Planning Summary

## Product Story & Positioning
- Mediprompt helps patients and caregivers craft safer, clearer AI prompts about health concerns.
- Visitors experience instant value through a public landing-page preview, then upgrade in the Wizard for tailored prompts.
- Primary goal: build trust with compliance-focused guidance while motivating the upgrade to a $9/mo subscription.

## Audience & Value Proposition
- Audience: patients and informal caregivers exploring medical questions online.
- Core value: structure conversations so AI stays educational, plain-language, and privacy-conscious.
- Differentiators: compliant microcopy, PHI avoidance reminders, and a structured Wizard that tailors tone and context.

## Monetization & Pricing
- Offer: "Mediprompt - Unlimited Prompt Builder (Monthly)" Stripe subscription at $9/month.
- Flow: Landing preview (2 free demos) -> Wizard sign up -> Server-created Stripe Checkout redirect to `/wizard?checkout=success&session_id={CHECKOUT_SESSION_ID}`.
- Paywall promise: unlimited prompts, cancel any time, no PHI storage.

## Compliance & Data Posture
- Not a covered entity; never collect, store, or transmit PHI or prompt text.
- All helper text emphasizes educational use and privacy-safe inputs.
- Separation of concerns: Supabase keeps only auth + subscription state, Stripe handles payments, Plausible captures aggregate events only.

## Voice, Visuals, and UX Guardrails
- Friendly medical tone, calm reassurance, and plain language.
- Palette: soft blues and greens with white backgrounds; Inter as primary typeface.
- Icons/buttons rounded, shadows subtle; compliance and privacy reminders near every input.
- Local two-preview cap enforced via `mp-landing-preview-count`; no server-side prompt tracking.

## Analytics Baseline (Plausible)
- `auth_modal_open` with `source` props from landing nav, wizard header, etc.
- `auth_modal_success` / `auth_modal_error` capturing `mode` outcomes for sign in/up/reset.
- `landing_preview_generated`, `landing_preview_limit_hit`, and `landing_prompt_copied` for the public demo.
- `wizard_prompt_generated`, `wizard_prompt_blocked`, `wizard_free_preview_consumed`, and `wizard_prompt_copied` to monitor gated usage.
- `wizard_paywall_viewed` and `wizard_paywall_cta_click` for subscription funnel visibility.
- `subscription_confirm_start` / `subscription_confirm_success` / `subscription_confirm_error` when handling the Stripe return.
- `profile_loaded`, `profile_load_unauthenticated`, `profile_load_not_configured`, and `profile_load_error` to track Supabase readiness.
See `docs/plausible-setup-checklist.md` for the remaining production setup steps and Plausible dashboard configuration tasks.

Stage 5 CSP hardening quick-start: `docs/security/csp-snippets.md`.

## Tech & Implementation Snapshot
- Front end: Next.js 15 App Router with TypeScript and Tailwind.
- Auth & data: Supabase (users table with `is_subscriber`, `subscribed_at`).
- Payments: Stripe Checkout session redirecting to `/wizard?checkout=success&session_id={CHECKOUT_SESSION_ID}`.
- Naming: prefix IDs and localStorage entries with `mp-` to avoid collisions.

---

# Site Map & Route Plan
- `/` (Landing)
  - Public access.
  - Chatbox preview limited to two runs via localStorage.
  - Primary CTA `Use Wizard`, secondary `Skip to Wizard`.
  - Legal footer links: `/privacy`, `/terms`, `/disclaimer`.
- `/wizard`
  - Auth-gated; requires Supabase login after first free preview.
  - Checks `GET /me` for `is_subscriber` on load; if `?checkout=success&session_id=...`, call `POST /subscribe/confirm` and refresh state before clearing the query params.
  - Shows paywall card and disables submit when `is_subscriber` is false.
  - Includes compliance reminder, structured form, result card with copy button, and Stripe CTA.

---

# Draft Copy Reference
## Landing Hero (current build)
- Heading: "Craft clearer, safer AI health prompts in seconds."
- Supporting paragraph: "Mediprompt helps patients and caregivers frame questions responsibly. Try the public chatbox below, then step into the Wizard for unlimited tailored prompts."
- Primary CTA: "Use Wizard"
- Secondary CTA: "Skip to Wizard"
- Badge: "Educational, not medical advice"

## Landing Preview Helper Text
- Input label: "What health topic are you exploring?"
- Placeholder example rotates between: "Discussing new blood pressure concerns", "Preparing questions about a child's asthma", "Clarifying insurance coverage terms".
- Helper text: "Use generic terms only - no names, ID numbers, addresses, or dates." (convert dash to hyphen if needed when implementing elsewhere.)
- Copy reminder: "This stays on your device - nothing is sent to our servers."
- Free cap notice: "You have 2 quick demos per browser. We never store what you type." and paid CTA messaging "Head to the Wizard to keep generating compliant prompts anytime."

## Paywall & Compliance Messaging (Wizard)
- Paywall headline (planned): "Subscribe for unlimited tailored prompts - $9/month."
- Bullets: "No PHI stored", "Cancel any time", "Educational only".
- Reminder above form: "Use generic terms; no identifiers." (exact phrasing to mirror landing language.)
- Stripe CTA label: "Subscribe $9/mo" or "Open the Wizard" post-subscribe.

## Footer Disclaimer
- "Mediprompt is educational only and does not provide medical advice, diagnoses, or treatment. Always consult a licensed clinician for personal care decisions."
- Links: Privacy, Terms, Disclaimer.

---

# MVP Success Criteria
- Landing page delivers instant preview value, includes PHI avoidance copy, and reliably routes to `/wizard`.
- Wizard enforces: login required after first free preview, subscribers only can submit prompts, and `?paid=1` unlocks the account immediately.
- Stripe Checkout session exists in test mode with redirect to `/wizard?checkout=success&session_id={CHECKOUT_SESSION_ID}`.
- Supabase project stores only auth + subscription metadata; no prompt text saved.
- Analytics events captured without user-provided text.
- Compliance messaging (educational only, no PHI) present on hero, helper copy, paywall, and footer.
