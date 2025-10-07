# Prompt Page Freemium Roadmap

## Goal
Deliver a prompt detail experience that keeps free prompts usable without friction while showcasing premium value compelling enough to convert visitors into a $6/month subscription.

## Success Metrics
- Track premium prompt view → subscription start conversion rate (baseline pre-launch, monitor weekly deltas).
- Watch bounce rate delta for locked prompts vs. free prompts to ensure the paywall does not drive exits.
- Gauge subscriber copy usage (copies per subscriber per week) to confirm unlocked prompts stay valuable.
- Measure related prompt click-through rate, including from locked states, to validate cross-discovery.

## Key Dependencies
- Supabase auth session via `AuthProvider` (components/auth/AuthProvider.tsx).
- Subscription status from `/api/me` plus Stripe checkout endpoint `/api/stripe/create-checkout-session`.
- Prompt data in `public/data/prompts/*.json` and index at `public/data/prompts.index.json` (needs premium metadata before rollout).
- Existing global chrome (navigation bar and footer) stays untouched; prompt page work layers within current layout components.

## Status
- **Phases 1–6 completed**: freemium metadata seeded, subscription gating wired, header/actions updated, paywall overlay in place, shared trust sections live, and checkout helper reused across banner/header/overlay CTAs.
- **Phase 7 implemented**: `prompt_view`, `prompt_locked_view`, `subscription_cta_click`, `library_prompt_copied`, and `library_quick_launch` events emit context-rich payloads (ready for Plausible/GA once configured).
- **Phase 8 covered**: manual + automated accessibility run (Playwright + axe) passes for locked premium state; responsive QA validated on mobile/tablet/desktop.
- **Phase 9 validated**: network/auth failures fail closed with retry copy, reactivation flow surfaces “Reactivate subscription,” and related prompt badges reflect free vs premium.
- **Phase 10 partially complete**: Stripe/auth end-to-end scenarios (checkout success, cancel, expired subscription, free prompt) verified; analytics confirmation + launch comms remain outstanding.

---

## Phase 1 – Data Contracts & Content Prep
**Objective:** Extend prompt data to flag premium content and supply UI copy without breaking legacy reads.
- Add `isFree`, `usageTips`, `relatedPrompts` to each prompt JSON (`public/data/prompts/*.json`), backfilling `isFree: true` for legacy entries.
- Optionally surface `isFree` in `prompts.index.json` so list and related cards can badge premium items without extra reads.
- Update type definitions in `lib/library/types.ts`, keep fields optional until backfill completes, and confirm `lib/library/serverData.ts` defaults missing values.

## Phase 2 – Subscription State Wiring
**Objective:** Reuse existing auth/subscription primitives on the prompt page.
- Read `user` from `useAuthContext()` and lazily fetch `/api/me` to resolve `is_subscriber`, caching the result per session.
- Derive `hasAccess = prompt.isFree || isSubscriber`; default to locked until both checks resolve so premium content never flashes.
- Handle auth/profile errors by displaying locked UI with retry messaging and logging for triage.
- When `hasAccess` is false, ensure both logged-out and unsubscribed users see the same CTA-driven locked state (copy overlay + optional banner).

## Phase 3 – Header Enhancements
**Objective:** Communicate access level immediately.
- Preserve the dark-blue header shell (breadcrumbs → category chip → title → description) while injecting the access badge and CTA row.
- Show a "FREE" badge next to the prompt title when `isFree` is true; apply complementary premium styling (no badge, lock icon as needed) when false.
- Gate the action row: render `PromptActionPanel` only if `hasAccess`; otherwise present a "Subscribe to Copy" button wired into the checkout helper alongside always-on "Copy Link" and "Back to Library" actions.
- Keep action buttons inline on desktop, stack gracefully on tablet/mobile, and maintain left alignment to match existing layout conventions.

## Phase 4 – Copy-Ready Prompt Section
**Objective:** Deliver full text to subscribers and a persuasive paywall for everyone else.
- Lead with the "Copy-ready prompt" heading plus safety guidance copy so tone stays consistent across free and premium prompts.
- Expose an accessible textarea with label + description so screen readers announce context and read the safety guidance.
- Keep the textarea read-only across states, preserving existing styling and scroll behavior for long prompts.
- Locked state: truncate to first ~3 lines with gradient fade, overlay lock iconography, "Subscribe to unlock this prompt" messaging, a benefit list (access to 50+ prompts, new prompts monthly, cancel anytime), and a primary high-contrast "Subscribe for $6/month" CTA wired into auth + checkout.
- Unlocked state: render the complete prompt with copy + quick launch interactions unchanged, including success toast + ChatGPT/Claude/Gemini panel reveal.

## Phase 5 – Shared Content Blocks
**Objective:** Maintain trust-building sections for everyone.
- Usage Tips stay globally visible: render `prompt.usageTips` when present (privacy reminders, safety checks, best practices, escalation guidance), otherwise fall back to the current static list.
- Related Prompts grid persists: badge premium cards using `isFree`, show category chip/title/description first line, include a lock icon for premium entries, and keep navigation active while relying on the destination page for gating.

## Phase 6 – Subscription CTA & Checkout Flow
**Objective:** Provide a single, clear path to upgrade.
- Build a lightweight client helper (e.g., `lib/subscription/checkout.ts`) that opens auth when needed, posts to `/api/stripe/create-checkout-session`, stashes the `sessionId` in `sessionStorage`, and redirects to `session.url`, mirroring the wizard flow.
- Accept an optional `returnPath` so successful checkouts land back on the originating prompt.
- Detect existing subscriptions and route those CTAs to the billing portal or account page to prevent duplicate charges or redundant messaging.
- Offer an optional dismissible top-of-page banner ("This is a premium prompt. Subscribe for $6/month…") for non-subscribers, reusing the same checkout helper, persisting dismiss state per session, and surfacing a compact "Subscribe" CTA.

## Phase 7 – Analytics & Instrumentation
**Objective:** Quantify engagement and conversion.
- Fire `prompt_view` on mount with `{ prompt_id, is_free, is_logged_in, is_subscriber }`.
- Fire `prompt_locked_view` whenever premium content renders for users without access.
- Fire `subscription_cta_click` on every upgrade interaction (overlay button, banner button) with source metadata.
- Emit existing `library_prompt_copied` and `library_quick_launch` events for unlocked usage to track downstream value.

## Phase 8 – Accessibility & Responsive QA
**Objective:** Meet WCAG AA and ensure great mobile/desktop experiences.
- Ensure overlays and CTAs are keyboard reachable with visible focus, and announce locked state via `aria-live` or descriptive copy.
- Confirm color contrast for badges, overlays, and CTAs meets AA thresholds.
- Check layout across breakpoints: single-column mobile, 2-column tablet related prompts, 3–4 column desktop.
- Add skip links only if the page length merits it to avoid unnecessary navigation noise.

## Phase 9 – Edge Cases & Resiliency
**Objective:** Handle atypical states gracefully.
- Treat expired or lapsed subscriptions as non-subscribers and shift CTA copy to "Reactivate subscription".
- Surface inline errors with retry actions when profile or checkout calls fail, but keep the rest of the page interactive.
- Suppress paywall messaging for subscribers viewing free prompts to avoid confusion.
- Badge related prompts accurately regardless of mix so navigation stays intact.

## Phase 10 – Launch Checklist
**Objective:** Verify end-to-end readiness before release.
- Run scenario tests: logged-out premium, active subscriber premium, free prompt, expired subscription, network error handling, Stripe success/cancel flows.
- Confirm auth modal and checkout redirects behave across desktop and mobile.
- Verify analytics payloads in Plausible debug mode before flipping the flag.
- Perform a keyboard + screen reader pass on the paywall and copy controls.
- Smoke test copy button and quick launch for unlocked prompts.
- Update docs/FAQs and circulate an internal announcement plan.

---

## Implementation Notes
- **Data model:** Extend each prompt JSON with `isFree`, `usageTips`, and `relatedPrompts` arrays (see Phase 1) so locked views can render trust content without extra fetches.
- **Component hierarchy:** Keep work scoped to `app/library/[slug]/page.tsx` by extracting helpers (`PromptHeader`, `PromptContent`, `PromptTextArea`, `SubscriptionOverlay`, `UsageTips`, `RelatedPrompts`) as needed for clarity.
- **Auth & access control:** Derive `hasAccess` using `useAuthContext()` + `/api/me`; subscribers and free prompts bypass the paywall while logged-out or lapsed users hit the CTA overlay and optional banner.
- **CTA flow:** Centralize checkout logic in `lib/subscription/checkout.ts` so overlays, buttons, and banners all reuse the same upgrade path and respect return URLs.
- **Performance:** Continue static generation for prompt data, lazy-load analytics and any future media, hit <2s render on 3G, surface prompt text immediately (no layout shift), and resolve subscription checks in the background without blocking content.
- **Responsive behavior:** Align with existing breakpoints (single-column mobile, 2-column tablet, 3–4 column desktop) and keep CTAs prominent across viewports (see Phase 8).

## Copy & Messaging Guidelines
- Locked premium messaging should stay factual: highlight missing full prompt access, $6/month pricing, value props (50+ prompts, new monthly, cancel anytime), and avoid guilt or scarcity tactics.
- Free prompts omit subscription copy; focus the guidance text on safe, effective usage.
- Button labels: primary CTA is "Subscribe for $6/month"; secondary banner CTA is "Subscribe" with supporting copy.
- Overlay benefits render as concise checkmarked bullets; keep icons (e.g., 🔒) decorative-only with screen-reader labels.
- Ensure success toasts and banner dismiss messaging stay on-brand and expire gracefully.
- Limit CTAs to the overlay button and optional banner; avoid stacking extra upsells that could clutter the page.

## Next Steps
1. Kick off Phase 1 data updates and type changes.
2. Ship Phase 2–4 gating logic in `app/library/[slug]/page.tsx` behind a feature flag for staged rollout.
3. Sequence Phases 5–10 with design, analytics, and CX partners to align launch timing.
