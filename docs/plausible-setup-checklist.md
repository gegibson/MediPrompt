# Plausible Analytics — Ready-to-Finish Checklist

_Status: instrumentation shipped (2025-02-14). Needs env + Plausible config before launch._

## 1. Environment Variables
- [ ] Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to the production hostname (e.g., `mediprompt.com`).
- [ ] (Optional) Set `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC` if using a custom/self-hosted script URL (e.g., `https://stats.mediprompt.com/js/script.js`).
- [ ] Redeploy after setting the values so Next.js injects the script (`app/layout.tsx`).

## 2. Plausible Dashboard Setup
- [ ] Add the site in Plausible using the same domain as above.
- [ ] Enable **Custom Properties** (Site Settings ▸ General) so event props like `source`, `is_subscriber`, etc. are captured.
- [ ] (Optional) Enable outbound proxying / first-party script if routing via a custom subdomain.

## 3. Goals & Funnels
- [ ] Mark these events as Goals in Plausible → Goals tab:
  - `auth_modal_success` (use property filters `mode=sign-up` and `mode=sign-in` as needed)
  - `landing_preview_generated`
  - `wizard_prompt_generated`
  - `wizard_paywall_cta_click`
  - `subscription_confirm_success`
- [ ] (Optional) Track awareness diagnostics via goals or dashboards:
  - `wizard_prompt_blocked` (paywall friction)
  - `wizard_free_preview_consumed`
  - `profile_load_error` / `profile_load_not_configured`

## 4. Verification Pass
- [ ] After deploy, open the site with Plausible debugger (browser devtools → network `event` requests) to ensure events fire.
- [ ] Verify events appear in the Plausible live dashboard with correct props (no prompt text is sent).

## 5. Related Follow-ups
- [ ] Update `docs/stage-1-planning.md` if new events are introduced later.
- [ ] Coordinate CSP hardening (see `docs/security/csp-snippets.md`).
- [ ] Decide on a data retention window inside Plausible (defaults to unlimited for paid plans).

## Reference
- Event helper: `lib/analytics/track.ts`
- Script injection: `app/layout.tsx`
- Landing events: `app/page.tsx`
- Wizard + paywall events: `app/wizard/page.tsx`
- Auth modal events: `components/auth/AuthProvider.tsx`
