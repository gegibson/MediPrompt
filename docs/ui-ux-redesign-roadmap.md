# MediPrompt UI/UX Redesign Roadmap (Final MVP)

This roadmap translates the visual and branding directives into actionable tasks for implementing CSS- and layout-only changes. Avoid altering existing functionality, logic, or data flows.

## 1. Global Style & Branding Foundation

- **Color Palette:** Define the following root variables (`:root` scope): `--color-primary-background: #FFFFFF`, `--color-secondary-background: #F8F9FA`, `--color-text-primary: #212529`, `--color-text-secondary: #6C757D`, `--color-accent: #0056b3`, `--color-accent-hover: #004494`.
- **Typography:** Ensure Inter is imported globally and set as the default `body` font. Apply the typographic scale: `h1` 42px/700, `h2` 32px/700, `h3` 20px/600, `p` 16px/400/1.6 line-height, small labels 14px/500 with 0.5px letter-spacing and uppercase.
- **Layout & Spacing:** Constrain the main content wrapper to a centered `max-width: 1100px`. Increase vertical spacing between sections to at least 80px and replace `<hr>` usage with spacing utilities. Eliminate hard divider lines; prefer whitespace or shadows.

## 2. Global Component Redesign

- **Header / Navigation Bar:**
  - Remove the announcement banner (`"Join the MediPrompt beta..."`) so a single header remains.
  - Delete the `"AI Wizard"` nav link.
  - Style: background `var(--color-primary-background)`, no bottom border, apply `box-shadow: 0 2px 4px rgba(0,0,0,0.05)`. Nav link default color `var(--color-text-primary)` with hover state `var(--color-accent)`.
- **Footer:**
  - Strip the email signup and descriptive copy.
  - Leave only © 2025 MediPrompt and links: Privacy, Terms, Disclaimer.
  - Style links with `var(--color-text-secondary)` and hover to `var(--color-text-primary)` using updated typography.
- **Buttons:**
  - Primary buttons: background `var(--color-accent)`, text `var(--color-primary-background)`, padding `12px 24px`, no border, `border-radius: 8px`, hover background `var(--color-accent-hover)`.
  - Secondary buttons: transparent background, text `var(--color-accent)`, `2px` solid border in accent color, padding `10px 22px`, `border-radius: 8px`, hover background `#e7f1ff`.

## 3. Page-Specific Changes

- **Homepage (`/`):**
  - Remove sections: "Free Healthcare Prompt Library", "Ready for prompts tailored to your exact situation?" (including the 3-step list), pricing block with "$9/month" and "Unlock the Wizard".
  - Hero: update `h1` to “Get Better Answers from Healthcare AI.”; body copy “Copy trusted, expert-crafted templates to guide your AI conversations safely and effectively.”; keep only one CTA button labeled “Browse Prompt Library” linking to `/library`.
  - "Why Patients Trust Mediprompt": replace emojis with single-color line icons tinted `var(--color-accent)` and update typography per global styles.
- **Healthcare Library (`/library`):**
  - Add hero heading `h1` “Healthcare Prompt Library” with a supporting descriptive sentence.
  - Keep the existing Filters UI and behavior unchanged (no pill-style conversion). Do not alter `FilterPanel` or `MobileFilterSheet` markup or styles.
  - Prompt cards: remove borders, set background `var(--color-primary-background)`, add `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`, `border-radius: 12px`; replace category emojis with line icons in accent color. Keep prompt text collapsed by default with an “Expand” link styled as accent-colored text and “Copy prompt” as a secondary button.
- **AI Wizard Removal:**
  - Ensure the AI Wizard page and navigation references are removed entirely from the UI.

## 4. Final Review Checklist

- [ ] Announcement banner is gone; only one header remains.
- [ ] Inter font and color palette variables applied site-wide.
- [ ] Homepage simplified to hero + trust section; library/wizard/pricing sections removed.
- [ ] Footer reduced to copyright + Privacy/Terms/Disclaimer.
- [ ] Borders replaced by spacing or shadows across components.
- [ ] Library filters remain unchanged.
- [ ] Prompt cards float with shadows and collapse preview text by default.
- [ ] AI Wizard navigation and page removed.
