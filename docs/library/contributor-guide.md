# Healthcare Prompt Library — Contributor Guide

This guide walks non-backend contributors through adding prompt content, verifying updates locally, and preparing pull requests.

## 1. Prerequisites

- Node.js + npm installed (project uses Next.js 15). No database access required; the library runs on flat files.
- Clone the repo and install deps:

```bash
npm install
```

## 2. File Structure Overview

- `data/categories.json` — master list of categories (id, name, icon, description).
- `data/prompts.index.json` — generated metadata index; do not edit manually.
- `data/prompts/<id>.json` — one file per prompt body. Stores metadata + `body` field used for copy/expand.
- `public/data/` — auto-generated build artifacts (index + prompt bodies). Never hand-edit.

## 3. Adding a New Category

1. Open `data/categories.json` and add a new entry:

```json
{
  "id": "lab-results",
  "name": "Lab Results & Reports",
  "icon": "🧪",
  "description": "Helps translate test findings into follow-up conversations."
}
```

2. Run `npm run library:build-index` to validate JSON (fails if required fields missing).
3. Start the dev server (`npm run dev`) and visit `/dev/library-test` to confirm the new category pill appears with a count.

## 4. Adding or Updating a Prompt

1. Create a JSON file under `data/prompts/` using the prompt id for the filename, e.g. `data/prompts/lab-results-understanding.json`:

```json
{
  "id": "lab-results-understanding",
  "title": "Understanding Your Lab Results",
  "shortDescription": "Translate lab findings into follow-up questions and next steps.",
  "categoryId": "lab-results",
  "tags": ["lab-results", "questions"],
  "keywords": ["results", "follow up"],
  "createdAt": "2024-09-01T00:00:00.000Z",
  "featuredWeight": 8,
  "body": "Full prompt text here..."
}
```

2. Run the build step:

```bash
npm run library:build-index
```

The script copies bodies to `public/data/prompts/<id>.json` and rebuilds `public/data/prompts.index.json`.

3. Launch `/dev/library-test` to preview. Use the search box to confirm the new prompt appears.
4. Commit both `data/prompts/...` and the generated `public/data/...` outputs.

## 5. Verifying Locally

- `npm run dev`, visit `/dev/library-test?debug=events` to review analytics payloads.
- Toggle `NEXT_PUBLIC_LIBRARY_ENABLED=true` (already set in `.env.local`) to view the shell on `/`.
- For accessibility checks, run Chrome Lighthouse (Accessibility) on `/dev/library-test` and observe the “Escape collapses prompts” behavior.

## 6. Submitting Changes

1. Run tests/lint as requested (none required for flat file updates, but keep pipeline green).
2. Open a PR summarizing the new categories/prompts (include screenshots if UI impact).
3. Include QA checklist entries (from `docs/qa/library-qa-checklist.md`) in the PR description.

## 7. Rollback Plan

- Revert the specific prompt JSON file(s) and rerun `npm run library:build-index`.
- Commit the reversal + regenerated artifacts.

## FAQ

- **How do I handle Markdown?** Currently all prompts are JSON. Markdown support is planned for a future step.
- **Do I need Supabase?** No. The library is static; Supabase handles auth/wizard features separately.
- **How do I preview OG cards?** After metadata updates, use https://www.opengraph.xyz/ with the staging URL once deployed.
