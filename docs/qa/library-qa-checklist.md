# Healthcare Library QA Checklist

Use this checklist after running `npm run library:build-index` and launching `/dev/library-test` (development) or the landing page with `NEXT_PUBLIC_LIBRARY_ENABLED=true` (staging/production preview).

## 1. Functional Coverage

- **Category filters** – Toggle individual categories and multi-select combinations; verify counts update and analytics fire (`prompt_category_selected`, visible via `?debug=events`).
- **Search matching** – Test exact matches ("medication"), partials ("auth" → prior authorization prompt), and synonyms/acronyms (map in future). Confirm highlighted snippets and result counts update live.
- **Copy feedback** – Press "Copy prompt" on several cards; ensure clipboard contains the full body, button flashes "Copied!", and reverts to idle after ~2.4s. Toggle offline/denied clipboard to see "Copy failed" state.
- **Expand/collapse** – Expand multiple prompts, verify bodies load once, collapse via button and via `Esc`. Confirm `prompt_expanded` events send correct state.
- **Wizard CTA** – Trigger the empty-state CTA by searching for nonsense text; ensure the link routes to `/wizard` and logs `cta_clicked` with `location: "library-empty"`.

## 2. UX / Phase 3 Density

- **Desktop (≥1280px)** – Above the fold should show the section header, filter row, search/sort, and at least three full cards without scrolling.
- **Tablet (~834px)** – Check horizontal overflow behavior for filters (scrollable row) and ensure two cards remain visible.
- **Mobile (≤430px)** – Verify compressed spacing: filter row scrolls, search bar fits, 1–2 cards visible, expand/copy buttons remain thumb-friendly.
- **Color & typography** – Validate contrast with Chrome DevTools or axe; confirm badge text remains readable.

## 3. Edge Cases

- **Empty results** – Apply filters + query combo that yields zero hits; confirm empty-state message and Wizard CTA.
- **Large index stress** – Temporarily generate 5,000 mock prompts (see snippet below) and rebuild the index. Ensure scrolling, search debounce, and pagination remain smooth; watch DevTools Performance for long tasks.
- **Slow network** – Throttle to Fast 3G; confirm loading skeletons appear, first interactive time stays snappy, and copy still works.

<details>
<summary>Mock dataset snippet (run once, then clean up)</summary>

```bash
node - <<'JS'
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PROMPTS = path.join(ROOT, 'data', 'prompts');

async function main() {
  await fs.mkdir(PROMPTS, { recursive: true });
  const promises = [];
  for (let i = 0; i < 5000; i += 1) {
    const id = `mock-${i.toString().padStart(4, '0')}`;
    const body = {
      id,
      title: `Mock Prompt ${i}`,
      shortDescription: 'Stress test entry',
      categoryId: i % 2 === 0 ? 'talking-doctor' : 'insurance-billing',
      tags: ['mock'],
      keywords: ['stress'],
      createdAt: new Date().toISOString(),
      featuredWeight: i % 10,
      body: 'Mock body for perf testing.'
    };
    promises.push(fs.writeFile(path.join(PROMPTS, `${id}.json`), JSON.stringify(body, null, 2)));
  }
  await Promise.all(promises);
  console.log('Mock prompts written. Run `npm run library:build-index` next.');
}

main();
JS
```

After testing, delete the mock files:

```bash
rm data/prompts/mock-*.json
npm run library:build-index
```

</details>

## 4. Regression Watchlist

- **Analytics** – Use `?debug=events` to check that no prompt text or search strings leak.
- **Clipboard denials** – Browsers that block programmatic copy should surface the error state without crashing.
- **Cache headers** – Inspect `/data/prompts.index.json` response headers in production; confirm `Cache-Control` values and that updates show after build deploys.
- **A11y** – Re-run Lighthouse/axe after any visual tweaks; ensure `Esc` collapse behavior persists.

## 5. Sign-off

- [ ] Functional checks complete (list any issues)
- [ ] Density checks across breakpoints verified
- [ ] Edge cases exercised (mock data removed afterwards)
- [ ] Accessibility + analytics validated
- [ ] Ready to enable flag in staging

Document findings (screenshots, notes) in your release ticket or QA doc before promoting to production.
