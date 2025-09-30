# Healthcare Library — Ops Guide

This guide covers rollout, cache management, and rollback tasks once the Healthcare Prompt Library is live.

## 1. Rollout Checklist

- [ ] `NEXT_PUBLIC_LIBRARY_ENABLED` set to `true` in staging/production env vars.
- [ ] Generated assets (`public/data/` + `/public/og-healthcare-library.png`) deployed with latest build.
- [ ] QA checklist completed in staging (see `docs/qa/library-qa-checklist.md`).
- [ ] Analytics dashboards (Plausible or equivalent) confirm events appear after smoke testing.

## 2. Cache & Deployment

- Library data lives at `/data/prompts.index.json`, `/data/categories.json`, and `/data/prompts/<id>.json`.
- Next.js config sets `Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=900` for these paths.
- After deploying new prompts, CDN should refresh within ~5 minutes. To force faster updates:
  - Purge CDN cache for `/data/*` (e.g., Vercel `vc deploy --prebuilt` handles this; or use provider dashboard).
  - Ask clients to hard refresh if necessary (rare).

## 3. Rolling Back Content

1. Revert the offending prompt files (`data/prompts/*.json`) in git.
2. Run `npm run library:build-index` to regenerate public data.
3. Redeploy; caches will refresh automatically.
4. Confirm the prompt is gone via `/dev/library-test` or production landing with the flag enabled.

## 4. Monitoring

- **Performance** — Lighthouse runs (mobile + desktop) should stay under the LCP < 2.5s target. Watch for large index growth; consider sharding if prompts exceed ~5k.
- **Analytics** — Confirm Plausible (or alternative) receives `prompt_library_viewed`, `prompt_category_selected`, `prompt_searched`, `prompt_copied`, and `prompt_expanded` after each deploy.
- **Error Logs** — Monitor browser console and server logs for fetch failures (missing prompt body). The shell shows a user-facing error; fix missing files promptly.

## 5. Feature Flag Strategy

- For soft launches, keep `NEXT_PUBLIC_LIBRARY_ENABLED=false` in production but true in staging.
- To dark-launch updates: deploy with the flag off, QA via `/dev/library-test` in production, then enable the env var and redeploy (or use hosting provider runtime config).

## 6. Security & Compliance Notes

- Library content must remain educational-only; avoid adding PHI or treatment advice.
- Ensure the OG image and copy reinforce educational framing.
- Review disclaimers periodically for legal alignment.

## 7. Incident Response

- If the index build fails in CI, review logs for validation errors (missing fields, duplicate IDs). Fix content and rerun.
- If analytics flatline, confirm `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and script loading (CSP allowlist).
- Document incidents in the ops runbook/ticket system with steps taken and preventions.
