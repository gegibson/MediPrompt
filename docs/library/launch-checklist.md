# Healthcare Library — Launch Checklist

Run this checklist before enabling the library in production (flip `NEXT_PUBLIC_LIBRARY_ENABLED=true`).

## 1. Cross-Browser / Device Sweep

- [ ] Chrome (latest) — desktop
- [ ] Safari (latest) — desktop
- [ ] Firefox (latest) — desktop
- [ ] Edge (latest) — desktop (chromium)
- [ ] iOS Safari — latest stable (iPhone + iPad)
- [ ] Android Chrome — latest stable

Verify: header + filter row render without overflow, search and copy work, no console errors.

## 2. Legal / Compliance Copy

- [ ] Hero + section tags mention “Educational only”
- [ ] Footer disclaimer accurate and visible
- [ ] Empty-state CTA copy reviewed by compliance
- [ ] OG metadata (title/description) approved by marketing/legal

## 3. Performance Validation

- [ ] `npm run build && npm run start`
- [ ] Run Lighthouse (Performance + Accessibility) in desktop + mobile modes; confirm:
  - Largest Contentful Paint < 2.5s
  - CLS < 0.1
  - No significant long tasks in Performance panel
- [ ] Throttle to Fast 3G; confirm skeletons display and copy action still succeeds.

## 4. Analytics Verification

- [ ] Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (or analytics env) in production
- [ ] Trigger category selection, search, expand, copy with `?debug=events`
- [ ] Confirm events arrive in analytics dashboard (Realtime / custom goals)

## 5. Content Integrity

- [ ] No placeholder prompts (search `stubbed body`)
- [ ] OG image (`public/og-healthcare-library.png`) replaced with final design
- [ ] Data build clean (`npm run library:build-index`) and artifacts committed

## 6. Release Management

- [ ] Flip `NEXT_PUBLIC_LIBRARY_ENABLED=true` in production env
- [ ] Deploy build, monitor 5–10 minutes post-launch
- [ ] Tag release (`git tag <version>` or create release in repo)
- [ ] Update change log / release notes with library launch details

## 7. Post-Launch Monitoring

- [ ] Watch analytics/goals for 48 hours
- [ ] Monitor error tracking (console + server logs)
- [ ] Document lessons learned in ops runbook

Keep this checklist with the QA results so future updates follow the same verification path.
