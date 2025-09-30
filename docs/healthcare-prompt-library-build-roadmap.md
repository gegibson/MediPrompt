# Healthcare Prompt Library — Build Roadmap (Tool-Only)

Scope: Build the scalable, privacy-first library experience (data, search, filters, UI shell, analytics, performance, a11y). You’ll plug in the actual templates later.

Assumptions: Landing hero/sections are done; this roadmap covers the library itself and aligns with your compact Phase 3 goals and landing transformation plan.

## 1) Foundations & Project Setup

- Create a dedicated library/ module boundary (or feature folder) to isolate state, components, and assets.
- Add data/ folder for flat files:
  - categories.json (id, name, emoji/icon, description)
  - prompts.index.json (metadata only; no full bodies)
  - prompts/ (empty for now; later holds one body file per prompt)
- Define non-code contracts (README in library/):
  - What metadata fields exist and which are required (id, title, shortDescription, categoryId, tags, createdAt, featuredWeight, keywords).
  - Where files live and how they’re named (ids are filenames).
- Wire a minimal feature flag (env var) that can hide the library if needed during rollout.

Exit criteria: Folder structure, data contracts, and module boundaries created; app boots with a placeholder “Library coming soon” section.

Notes: Keep Phase 3 “compact above-the-fold” objective in mind for later UI tuning.

## 2) Data Pipeline (Flat Files, No DB)

- Author an internal spec for the build step that will:
  - Read prompts/ source files (JSON or Markdown-with-frontmatter).
  - Emit metadata-only prompts.index.json.
  - Optionally emit per-category index shards to support large scale later.
- Decide on body format (JSON vs. MD pre-rendered to HTML during build) and document the choice.
- Output all generated artifacts into public/data/ (or similar) for CDN caching.
- Add a lightweight content validation check (IDs unique, required fields present).
- Document update flow: “add a file → commit → CI builds → deploy.”

Exit criteria: Running build task that emits a valid prompts.index.json from sample stubs; content validation passes.

Why: Flat files + CDN meet performance/maintenance goals without Supabase for read-only content.

## 3) Library State & Data Access (Runtime)

- Create a data access layer (hooks or services) that:
  - Fetches categories.json and prompts.index.json once and caches in memory.
  - Exposes helpers: getCategoryCounts(), getByCategory(), getById().
- Implement on-demand body fetch:
  - fetchBodyById(id) retrieves public/data/prompts/<id>.json|html.
- Add a small in-memory cache for bodies; define a max cache size + LRU eviction.
- Add a library store (context or signals) for:
  - selectedCategories (multi or single), query, sort, page, expandedPromptIds, copiedPromptId.

Exit criteria: A test page can load the index, filter by a category, and fetch a single body on demand (no UI polish yet).

Notes: Keep data small up front; large bodies load on expand/copy.

## 4) Search & Ranking (Metadata-Only)

- Integrate a fuzzy search working over metadata only (title, tags, shortDescription, keywords).
- Establish weights & thresholds (document them) and debounce typing.
- Pipeline order: Category filter → Search → Sort → Paginate (fixed sequence).
- Add highlighting contract (title/description expose match ranges).
- Prepare for scale:
  - Web Worker option toggled by index size.
  - Optional category-sharded index fetch only when a pill is selected.

Exit criteria: Search returns sensible top results; highlighting works; performance stays smooth on 1–2k items.

Notes: This supports the “immediate value with compact layout” ethos.

## 5) UI Shell (Compact, Responsive, Accessible)

- Section header & disclaimer: inline “General Templates • Educational only” tag; no extra vertical row.
- Filter row: single-line pills with counts + “All”; overflow behavior on mobile (scrollable row).
- Search bar: compact height; clear button; aria labels; live region for result counts.
- Grid: responsive (1/2/3 columns), tight gaps tuned for Phase 3 density goals.
- Card:
  - Header chips (category, “General Template”).
  - Title (2-line clamp) + short description (2–3 lines).
  - Tags row (wrap).
  - Expand affordance; skeleton for body loading; body collapses with gradient fade.
  - Copy action with transient success state.
- Pagination: “Load more” button or IntersectionObserver sentinel.

Exit criteria: Library section renders with compact density, showing multiple cards above the fold on desktop; all components keyboard-accessible.

## 6) Analytics (Privacy-Safe, Metadata Only)

- Hook events (guarded by env so no-ops by default):
  - prompt_library_viewed (+counts), prompt_category_selected, prompt_searched (no query content), prompt_copied (category/prompt_id only), prompt_expanded, CTA events.
- Add a small track() wrapper that safely logs to console when ?debug=events is present.
- Add docs listing exact event names, payload shapes, and redaction rules.

Exit criteria: Events fire in dev; verified that no prompt text or queries are emitted.

## 7) Performance Budget & Tuning

- Initial payload: ensure the index is fetched (not imported) to keep JS bundle small.
- Lazy everything:
  - Body fetch only on expand/copy.
  - Lazy-load any heavy renderers (e.g., Markdown viewer) behind the expand path.
- Grid rendering cap: paginate; consider virtualization only if >200 visible cards at once.
- Caching: set long-lived CDN cache for /data/** with content hashing/versioning.
- Metrics: establish an LCP target (<2.5s) and measure after integrating into the landing page.

Exit criteria: Meets performance targets on a mid-range device; no layout shifts; smooth scroll/expand.

## 8) Accessibility & Compliance

- Keyboard:
  - Tab order through pills → search → cards; Enter/Space to toggle filters and expand; Esc to collapse.
- Semantics:
  - Proper headings; roles/aria for tabs or toggle buttons; aria-expanded, aria-controls on cards.
  - aria-live="polite" announcing result counts.
- Contrast & sizing:
  - Ensure WCAG 2.1 AA; minimum touch targets (44×44 on mobile).
- Compliance text:
  - Prominent “Educational only / no PHI” disclaimers near the library and in the footer.

Exit criteria: Passes WCAG AA checks and the “Escape closes expanded content” requirement.

## 9) QA Matrix (Functional & UX)

Functional

- Category filter (single or multi) behaves predictably with counts updating.
- Search works with synonyms/acronyms (e.g., CHF ↔ heart failure).
- Copy provides clear feedback; body loads reliably on expand/copy.

UX/Phase 3 density checks

- Desktop above-the-fold: filters + search + 3–4 full cards visible; no wasted whitespace.
- Mobile: compressed hero, visible filters, 1.5–2 cards visible.

Edge cases

- Empty results recovery (“clear filters” chip).
- Large index stress test (mock 5k items).

Exit criteria: All tests pass; above-the-fold density matches target.

## 10) SEO & Sharing (Static Library)

- Semantic structure in the library section; headings reflect content hierarchy.
- Ensure the landing page title/description reflect the library value; add Open Graph tags (`/og-healthcare-library.png`).
- Add a robots and caching policy for /data/ as needed.

Note: `/public/og-healthcare-library.png` is a placeholder. Replace with a designed 1200×630 image before launch.

Documentation

- Contributor how-to: `docs/library/contributor-guide.md`
- Ops rollout + rollback: `docs/library/ops-guide.md`
- Analytics reference: `docs/library/analytics-guide.md`

Exit criteria: Metadata validated; no SEO regressions.

## 11) Documentation & Handover

Contributor guide (non-technical friendly):

- How to add a category or prompt (where to put files, required frontmatter/fields).
- How to test locally and validate content.

Ops guide:

- How to roll back a bad content deploy.
- How to rotate cache versions.

Analytics guide:

- What events exist and how to view them (and what’s deliberately excluded).

Exit criteria: A new contributor can add a prompt end-to-end without help.

## 12) Launch Checklist

- Cross-browser/device sweep (Chrome, Safari, Firefox, Edge; iOS/Android).
- Legal/compliance copy confirmed.
- Performance budget validated on throttled network.
- Analytics goals visible in the dashboard.
- Backup current version and tag the release.

Exit criteria: Library enabled in production, guarded feature flag removed post-verification.

Artifacts: see `docs/library/launch-checklist.md` for the full verification list.

## Dependency Graph (at a glance)

2 Data Pipeline → 3 State/Data Access → 4 Search → 5 UI Shell

6 Analytics, 7 Performance, 8 A11y run in parallel once shell is in place.

9 QA depends on 4–8; 10 SEO, 11 Docs can start after 5.

12 Launch depends on all.

## Risks & Mitigations

- Index bloat → Keep metadata lean; shard by category if needed.
- Slow typing lag → Debounce & move search to a Web Worker when index grows.
- Cluttered UI at scale → Compact pills/grid and maintain above-the-fold density targets.
- Compliance drift → Lock phrasing and include in content validation checklist.
