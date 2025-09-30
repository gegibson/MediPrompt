# Library Module Boundary

This feature folder isolates the Healthcare Prompt Library: state, data access, UI shell, and assets.

Data contracts (metadata-only, no full bodies here):

- Category (categories.json)
  - id (string, required)
  - name (string, required)
  - icon (string, emoji or icon ref, required)
  - description (string, optional)

- Prompt index item (prompts.index.json)
  - id (string, required; also the body filename id)
  - title (string, required)
  - shortDescription (string, required)
  - categoryId (string, required)
  - tags (string[], optional)
  - keywords (string[], optional)
  - createdAt (ISO string, optional)
  - featuredWeight (number, optional; higher surfaces earlier)

Body format decision (Step 2):

- For the initial pipeline, prompt bodies are JSON files at `data/prompts/<id>.json` with this shape:
  - All metadata fields above, plus a `body` field (string) that contains the full prompt text or pre-rendered HTML/Markdown output.
- The build step emits a metadata-only index by stripping the `body` field from each file.
- In a later step, Markdown bodies may be supported and pre-rendered during the build.

Update flow (Step 2):

- Add/modify JSON files under `data/prompts/` and `data/categories.json`.
- Run `npm run library:build-index` locally to validate and emit `public/data/prompts.index.json`.
- Commit changes; CI runs the same build step and publishes artifacts via static hosting.

Non-code conventions:

- Source files live in `data/` at repo root.
  - `data/categories.json`
  - `data/prompts.index.json` (metadata only; no prompt bodies)
  - `data/prompts/` (one file per prompt body to be added later)
- File naming: prompt `id` equals the body filename (e.g., `data/prompts/<id>.json|md`).

Feature flag:

- `NEXT_PUBLIC_LIBRARY_ENABLED` ("true" / "false"). When false, the landing page shows a placeholder section: “Library coming soon.”

Notes:

- Step 1 only sets up structure and flag. Build pipeline, runtime data access, search, and UI details follow in later steps.

## Analytics

Events fired from the library shell (guarded by `trackEvent`, which is a no-op unless analytics is enabled):

- `prompt_library_viewed` — `{ prompt_count, category_count }`
- `prompt_category_selected` — `{ category_id, category_name, is_active, selected_category_count, prompt_count }`
- `prompt_searched` — `{ query_length, matches, category_filter_count }` (no query text captured)
- `prompt_copied` — `{ prompt_id, category_id }`
- `prompt_expanded` — `{ prompt_id, category_id, expanded }`
- `cta_clicked` (existing global event) — reused with `{ location: "library-empty", type: "secondary", target: "wizard" }`

Debug tip: append `?debug=events` to the URL locally to log payloads without hitting Plausible.

## Performance Budget & Verification

- **Targets:** LCP < 2.5s on a mid-range laptop (emulated Fast 3G), CLS < 0.1, Interaction to Next Paint < 200 ms for primary actions.
- **Initial payload:** Index and categories are fetched from `/data/**` at runtime (not bundled) and cached client-side with a tiny in-memory cache.
- **Lazy loading:** Prompt bodies load only when a card is expanded or copied; an LRU cache (size 20) keeps recent bodies in memory.
- **CDN caching:** Production serves `/data/**` with `Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=900` (set in `next.config.ts`).
- **How to measure:**
  1. Run `npm run library:build-index` to ensure fresh artifacts.
  2. Start the app (`npm run dev` for quick checks or `npm run build && npm run start` for production parity).
  3. Visit `/dev/library-test` and use Chrome DevTools Lighthouse (Performance + Best Practices) with the “Simulated Fast 3G / Mid-tier mobile” preset.
  4. Repeat on the landing page with `NEXT_PUBLIC_LIBRARY_ENABLED=true` to ensure the compact shell still keeps multiple cards above the fold.
- **Monitoring:** Keep an eye on the Lighthouse “Largest Contentful Paint” element — the shell header + first card cluster should render quickly thanks to the cached index fetch.

## Accessibility & Compliance Notes

- Keyboard: filter pills, search, sort, copy, and expand actions are buttons/selects with focus styles; `Escape` collapses all expanded prompts.
- Semantics: results grid exposes `role="list"` with each card as `role="listitem"`; expand buttons use `aria-controls` pointing at the preview body, which holds a stable `id`.
- Live regions: result count label uses `aria-live="polite"`; copy status button uses `aria-live` so screen readers announce success/error.
- Disclaimers: the shell repeats the “General templates • educational only” tag and the empty-state CTA reiterates the Wizard path for compliance messaging.
- Validation: run axe-core or Lighthouse Accessibility on `/dev/library-test` and the landing page (flag enabled). Confirm WCAG 2.1 AA color contrast remains satisfied after theme updates.

See `docs/qa/library-qa-checklist.md` for the full QA matrix covering functional, UX/density, and edge-case regression tests.

## Documentation Index

- Contributor guide: `docs/library/contributor-guide.md`
- Ops guide: `docs/library/ops-guide.md`
- Analytics guide: `docs/library/analytics-guide.md`
- Launch checklist: `docs/library/launch-checklist.md`
