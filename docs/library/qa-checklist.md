# Healthcare Library QA Checklist

Use this list before shipping changes to the library experience. Mark each item with the date, browser/device, and pass/fail notes.

## Desktop Checks
- Filters: toggle categories, situations, audiences, and sort options; confirm counts update and results match expectations.
- Search: run keyword queries, verify highlighting relevance and zero-result messaging.
- URL persistence: reload the page with filters/query applied; confirm state restores from query params.
- Pagination: navigate multiple pages, refresh, and use next/prev buttons; ensure `page` stays in sync with the URL.
- Detail navigation: open a prompt, use browser back/forward to return to the exact previous list state.

## Mobile/Responsive Checks
- Breakpoint: test at 375px and 768px widths (or similar) to confirm layout integrity.
- Mobile filters: open the filter sheet, apply selections, close, and ensure list updates.
- Scroll behaviour: verify pagination controls and empty/error states render correctly on small screens.

## Accessibility & Performance
- Lighthouse: run against `/library` (desktop and mobile modes) and confirm SEO/Accessibility/Best Practices/Performance scores meet targets.
- Contrast: validate the navy palette and primary accents meet WCAG AA using tooling (e.g., Chrome DevTools contrast checker).
- Keyboard: tab through filters, pagination, and detail pages to ensure focus rings and activation work.

## Analytics Verification
- Filters/zero results: toggle filters and trigger zero-result searches with `?debug=events` to confirm analytics fires.
- Prompt interactions: copy a prompt and use quick-launch links, checking that events log as expected.

Document findings (including screenshots or metric scores) in release notes or the PR description.
