# Manual Performance Review Checklist (Stage 5)

Run this checklist during release candidates to complement the automated budgets enforced by `npm run perf:check` and the CI workflow.

## 1. Test Environment
- **Device:** Simulate a mid-tier laptop (Chrome DevTools → Performance panel → Throttle CPU 4x) or use real hardware with similar specs (quad-core CPU, 8 GB RAM).
- **Network:** Chrome DevTools → Network panel → set to `Fast 3G` for baseline and `No throttling` for control. Disable cache.
- **Build:** Use a production build (`npm run build && npm run start`) or staging deployment with identical configuration. Ensure Supabase/Plausible env vars match the target environment.

## 2. Landing Page Audit (`/`)
- Load the page fresh (empty cache). Record First Contentful Paint and Largest Contentful Paint in Performance panel; target < 2.5 s on Fast 3G.
- Scroll and interact with the hero form:
  - Generate the first preview and note the time to result render (< 1.5 s after submit).
  - Verify the preview limit banner shows instantly on the 3rd attempt (no visible lag).
- Open DevTools → Network → filter by `mp-` to confirm no Supabase or Plausible requests fire until an auth or analytics action occurs.

## 3. Auth Modal Responsiveness
- Trigger the Sign-in modal from the landing nav and confirm the modal paints < 150 ms after click (check DevTools Timings waterfall).
- Switch between Sign in / Sign up / Reset tabs rapidly; interaction delay should remain < 100 ms with no dropped frames (Performance panel → FPS ≥ 50).
- If Supabase is configured, submit a sign-in attempt and confirm responses return within 500 ms on Fast 3G (network round trip largely Supabase-bound).

## 4. Wizard Flow (`/wizard`)
- Navigate directly while logged out; ensure initial render completes with hydration under 2.5 s (Performance panel screenshot).
- Submit the free preview and note time to prompt render (< 1.5 s). Verify paywall modal appears instantly on second submit.
- Log in and repeat; check that the Supabase chunk loads lazily (Network → look for `supabase-js` request only after modal interaction or auth flow).
- For subscribers, run `POST /api/subscribe/confirm` via the UI and ensure the plan badge updates without noticeable lag (< 200 ms re-render).

## 5. Regression Spot-checks
- Lighthouse (Chrome → Lighthouse) in Performance-only mode; target score ≥ 90 on desktop and ≥ 80 on mobile emulation. Capture trace for records.
- React Profiler (DevTools → Profiler) around the wizard form submission. Verify no long (> 16 ms) commits during idle state; paywall branches should commit < 10 ms.
- Network panel: ensure JS payload on first visit stays ≤ 180 kB (matches automated budget). Cross-check with `.next/perf-metrics.json` from the latest CI run.

## 6. Record & Follow-up
- Document measured metrics (FCP, LCP, interactive timings) alongside the commit hash.
- Note any regressions or borderline values; open issues with reproduction steps and attach traces (Performance / Lighthouse JSON exports).
- If manual findings contradict automated checks, re-run `npm run perf:check` locally to validate and adjust budgets if necessary.

Repeat this checklist after significant UI, Supabase, or dependency changes to keep Stage 5 performance guardrails healthy.
