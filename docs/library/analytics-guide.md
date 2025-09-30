# Healthcare Library — Analytics Guide

Reference for the privacy-safe events emitted by the library shell and how to inspect them.

## 1. Event Catalog

Fired via `trackEvent` (Plausible). All payloads avoid prompt text and user queries.

| Event | Description | Payload |
|-------|-------------|---------|
| `prompt_library_viewed` | Library section loaded | `{ prompt_count, category_count }` |
| `prompt_category_selected` | Category pill toggled (including “All”) | `{ category_id, category_name, is_active, selected_category_count, prompt_count }` |
| `prompt_searched` | Query change with results | `{ query_length, matches, category_filter_count }` |
| `prompt_copied` | Prompt copied to clipboard | `{ prompt_id, category_id }` |
| `prompt_expanded` | Prompt expanded/collapsed | `{ prompt_id, category_id, expanded }` |
| `cta_clicked` | Existing event reused for Wizard CTA | `{ location: "library-empty", type: "secondary", target: "wizard" }` |

## 2. Local Debugging

- Append `?debug=events` to any page URL (e.g., `/dev/library-test?debug=events`) to log payloads to the browser console, even if Plausible is disabled.
- Confirm no prompt body text or raw query strings appear.

## 3. Plausible Dashboard Setup

- Recommended custom goals:
  - Category selection (`prompt_category_selected`)
  - Prompt expand (`prompt_expanded`)
  - Prompt copy (`prompt_copied`)
  - Library search (`prompt_searched`)
- Filter dashboards by `page=library` once the landing page is live, or use custom properties like `category_name` for segmentation.

## 4. Testing in Staging/Production

1. Deploy with `NEXT_PUBLIC_LIBRARY_ENABLED=true` (or use `/dev/library-test`).
2. Open DevTools Network → `collect` requests (Plausible) to verify events fire.
3. Within Plausible, check the Realtime dashboard or custom goals after triggering each action.

## 5. Troubleshooting

- If events stop appearing:
  - Verify environment variables `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC`.
  - Check CSP headers in `next.config.ts` include the Plausible origin.
  - Ensure ad blockers aren’t suppressing testing sessions (use a clean browser profile).
- If unexpected payload data appears, review `components/library/LibraryShell.tsx` to confirm only IDs/counts are sent.
