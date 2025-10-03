# MediPrompt UI Roadmap

Based on SolidStarts.com UI/UX patterns, adapted for a healthcare context. The logic, IA, and interaction models mirror the provided plan while aligning with our Next.js 15 + React 19 + Tailwind 4 stack.

## 0) Overview & Goals
- Present a trustworthy, clean healthcare interface inspired by SolidStarts’ clarity and density.
- Prioritize mobile-first navigation, fast discovery (search + filters), and clear CTAs.
- Keep the experience HIPAA-safe (no PHI persistence) and performant (<3s LCP on 4G).

Key pages
- Landing/Home (`/`)
- Healthcare Library (`/library`) with filters and sort
- Content Detail (`/library/[slug]`)
- Profile/Account (`/profile`)
- Auth flows (`/login`, `/signup`, `/reset-password`)

Global patterns
- Sticky header with logo, search, cart, and account.
- Slide-out navigation for mobile; announcement bar as needed.
- Card-based grids; accessible filter chips; strong empty/loading states.

## 1) Design System Foundation

### Color Palette
- Primary Blue: `#4A7BC7` (primary CTAs, links)
- Healthcare Teal: `#00A19C` (secondary actions, accents)
- Neutral Gray: `#6B7280` (text, borders)
- Background White: `#FFFFFF`
- Light Gray BG: `#F9FAFB`
- Success Green: `#10B981`
- Warning Orange: `#F59E0B`

Tailwind mapping (proposed tokens)
- `--color-primary: #4A7BC7`
- `--color-accent: #00A19C`
- `--color-text: #111827`
- `--color-muted: #6B7280`
- `--color-bg: #FFFFFF`
- `--color-bg-subtle: #F9FAFB`

### Typography
- Primary font: Inter (or system UI, fallbacks)
- Sizes: H1 32–36, H2 24–28, H3 20, Body 16, Small 14
- Weights: 400, 500, 600, 700

### Spacing & Layout
- Base unit: 8px
- Container max width: 1200px
- Page padding: 16px mobile, 24–32px desktop
- Grid: 12-col responsive; cards 1/2/3 col at mobile/tablet/desktop

## 2) Information Architecture & Navigation

### Header
- Fixed white header with subtle shadow (64–72px)
- Left: logo (~120px). Right: search, cart badge, account avatar, hamburger
- Mobile: hamburger opens slide-out; search collapsed to icon
- Optional Announcement Bar above header (promos, notices)

Acceptance criteria
- Header remains visible on scroll; focus trap in open menus
- Cart badge updates from shared auth/cart state
- Keyboard navigation: Tab cycles across header controls; ESC closes menus

### Navigation Drawer (Burger Menu)
- Slide-out from right, full-height; scrim backdrop
- Items: Home, Healthcare Library, Resources, About, Contact, Account Settings, Log Out
- 48px touch targets; icons + labels; 300ms slide animation

### Footer
- Columns with links (Legal, Social, Resources); newsletter sign-up
- Language links if applicable (SolidStarts exposes `/es/`)

## 3) Page Structures

### Landing Page
1) Hero: strong headline, subheadline, primary CTA (rounded 8px), healthcare imagery
2) Features Grid: 3-up desktop, 1-up mobile; icon + title + description
3) Trust Indicators: certifications, testimonials, anonymized stats
4) Footer: legal, social, newsletter

### Healthcare Library

Filter Panel (left sidebar on desktop, modal on mobile)
- Width 280–320px; collapsible sections
- Sort By: Relevance (default), Title A–Z, Title Z–A, Most Recent, Most Popular
- Medical Categories (patient journey): Talking to Your Doctor, Managing Medications, Procedures & Tests, Chronic Conditions, Life Stages & Prevention, Healthcare Logistics, Mental Health & Wellness, Nutrition & Lifestyle
- When to Use (situation tags): Before appointment, After diagnosis, Starting treatment, Experiencing symptoms, Planning ahead, Emergency preparation, Daily routine, Following up on care
- Who is this for? (audience tags): For myself, For a family member, For a child, For an aging parent, Pregnancy-related

Filter UI
- Radio for single-select (Sort); checkbox for multi-select facets
- Reset link; Apply on mobile; active filter chips above grid
- Search ranks title matches highest, then patient-facing/situation/audience tags, and boosts newer prompts; tagging matters for discoverability.

Content Grid
- Cards: image/icon, title, description, category tag, “Read more”
- 3/2/1 columns desktop/tablet/mobile; pagination or infinite scroll

### Content Detail (Article/Resource)
- Title, metadata (category, updated date, read time)
- Hero media optional; Table of Contents for long content
- Evidence/Trust callouts; related resources; share & print

### Profile/Account
- Sections: Account Info, Saved Resources, Order History (if used), Preferences, Notifications
- Connected to cart/auth; privacy-first defaults

## 4) Components

Core
- AnnouncementBar
- SiteHeader (logo, search, cart, account, burger)
- NavDrawer (mobile)
- SearchBox with typeahead (header + library page)
- Button variants (primary, secondary, subtle)
- Card (resource), Badge/Tag, Pill filters
- Accordion (filters), Pagination, Breadcrumbs
- Modal/Dialog (filter on mobile), Toast/Inline alerts

States
- Loading skeletons for cards and detail pages
- Empty results with helpful tips
- Error states with retry

## 5) UI Patterns & Interactions

Buttons
- Primary: blue bg, white text, radius 8px; hover darken and subtle shadow
- Secondary: white bg, blue border/text; focus outlines visible

Forms
- Inputs with gray border; focus blue border; error red border + helper text
- Labels above fields; accessible descriptions; 44px min touch targets

Cards
- White bg, radius 8px, subtle shadow; 16–24px padding; hover elevation

Responsive breakpoints
- Mobile <640px; Tablet 640–1024px; Desktop >1024px

## 6) Healthcare-Specific Elements

Icons
- Heart/pulse, Stethoscope, Pills, Brain, Baby, Shield+cross, Clipboard, Calendar

Placeholders
- Medical settings; diverse professionals; patient–doctor interactions; calming imagery

Trust
- HIPAA badge; professional associations; secure connection indicators; evidence tags

## 7) Accessibility (WCAG 2.1 AA)
- Proper heading hierarchy; landmarks (header, nav, main, footer)
- Alt text for images; aria-labels for icons/buttons
- Keyboard: focus management for drawer/dialog; ESC to close
- Contrast ≥ 4.5:1 for text; visible focus rings
- Skip-to-content link

## 8) Performance & SEO
- Performance: image optimization (next/image), lazy loading, font-display: swap
- Prefetch key routes; cache headers for static assets
- SEO: semantic titles/descriptions, structured data on articles, clean slugs
- LCP target < 3s on 4G mid-tier device; monitor with `scripts/perf-check.mjs`

## 9) Analytics & Events
- Header: search open, submit, clear; cart open; account open
- Library: filter open/close, facet select/deselect, reset, apply; sort change; page change
- Cards: card view, click-through
- Detail: TOC click, share/print, related click
- Auth: login/register success; preferences save
- Document events in `docs/plausible-setup-checklist.md` alignment

## 10) Technical Plan (Next.js 15 + React 19 + Tailwind 4)

Foundations
- Add design tokens via CSS variables in `app/globals.css`
- Configure Tailwind theme extensions (colors/spacing)

Header & Nav
- `components/site/AnnouncementBar.tsx`
- `components/site/SiteHeader.tsx` (logo, SearchButton, CartButton, AccountButton, BurgerButton)
- `components/site/NavDrawer.tsx` with focus trap, `useLockBodyScroll`

Search
- `components/site/SearchBox.tsx` with async typeahead provider
- `/api/search` placeholder for typeahead (client-only fallback acceptable initially)

Library
- `app/library/page.tsx` (grid + filter panel)
- `components/library/FilterPanel.tsx`, `FilterChip.tsx`, `ResourceCard.tsx`, `SortSelect.tsx`, `Pagination.tsx`
- `lib/library/filters.ts` (facet config + serialization)

Detail
- `app/library/[slug]/page.tsx` article template with TOC and trust callouts

Profile
- `app/profile/page.tsx` with tabs: Info, Saved, Orders, Notifications

State & Data
- Client state: filters, pagination, saved items (local or Supabase-backed)
- Shared auth/cart using existing Supabase + Stripe hooks
- Prompt dataset: `/data/prompts/*.json` now supports `contentType`, `audiences`, `languages`, `createdAt`, `updatedAt`; run `npm run library:build-index` after editing to refresh `public/data/prompts.index.json`.
- Prompt metadata fields (MVP):
  - `categoryId` (one of the eight patient journey categories)
  - `subcategory` (optional string for future grouping)
  - `patientFacingTags` (array of plain-language keywords surfaced in search)
  - `situationTags` (array of IDs from "When to Use" filter)
  - `audienceTags` (array of IDs from "Who is this for?" filter)
  - Optional `contentType`, `languages`, `searchBoost`, `createdAt`, `updatedAt`
- Example prompt JSON:

```json
{
  "id": "primary-care-intake-checklist",
  "title": "Primary Care Intake Checklist",
  "shortDescription": "Organize pre-visit screenings, vitals, and consent reminders before a family medicine appointment.",
  "categoryId": "talking-to-your-doctor",
  "subcategory": "preparing-for-appointments",
  "patientFacingTags": ["New patient visit", "Annual checkup", "Family doctor"],
  "situationTags": ["before-appointment", "planning-ahead"],
  "audienceTags": ["for-myself", "for-family-member"],
  "keywords": ["intake", "screening", "consent"],
  "createdAt": "2024-10-03T00:00:00.000Z",
  "updatedAt": "2024-10-03T00:00:00.000Z",
  "contentType": "Guideline",
  "body": "..."
}
```

## 11) Implementation Priority & Milestones

Phase 1: Foundation (1–2 sprints)
1) Design tokens (colors, typography, spacing)
2) Header + AnnouncementBar + Footer
3) Responsive grid + card component
4) Basic Landing page

Phase 2: Core Features (2–3 sprints)
1) Healthcare Library with filters, sorting, pagination
2) SearchBox + typeahead
3) Profile/Account sections (Info, Saved)
4) Mobile Nav Drawer

Phase 3: Enhancements (1–2 sprints)
1) Micro-interactions (hover, slide, skeletons)
2) Advanced filtering (multi-select chips, URL sync)
3) Preferences & saved items persistence
4) Performance tuning & SEO polish

## 12) Definition of Done (per area)
- Header/Nav: keyboard accessible, sticky, AA contrast, analytics firing
- Library: URL-synced filters/sort, accessible accordions, empty/loading states
- Detail: TOC anchors, print-friendly CSS, structured data
- Profile: guarded routes, sensible defaults, error handling
- Perf: LCP < 3s; CLS < 0.1 on target devices

## 13) Open Questions
- Do we expose multi-language now (EN/ES) or stub for later?
- Saved resources: local-only until subscription, or require auth?
- Pagination vs. infinite scroll preference for Library?

---

This roadmap keeps the provided logic intact while deepening it with component inventory, acceptance criteria, analytics, accessibility, and a file-level plan mapped to our current Next.js project structure.
