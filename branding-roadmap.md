# MediPrompt Branding & UI Roadmap

## Goals
- Deliver a calm, trustworthy, healthcare-friendly experience for patients seeking guidance.
- Communicate HIPAA-conscious design and clear “no PHI” expectations.
- Refresh visual identity and UI polish without touching application logic or tools.
- Build reusable design tokens and component styles for ongoing consistency.

## Brand System
### Palette (Healthcare Calm)
- Primary blue `#2D9CDB` for CTAs, hero accents, informational links.
- Secondary green `#27AE60` for success states, wellness badges, confirmation moments.
- Accent yellow `#F2C94C` for highlights, gentle alerts, hover details.
- Background `#F9FAFB` with white card surfaces and borders `#E5E7EB`.
- Typography: body/headlines use dark neutral `#333333` / `#4F4F4F`.

### Typography
- Headings: Manrope (500–700 weight range).
- Body & UI: Source Sans 3 (400–600 weight range).
- Scale: 12–20px UI, 24–40px hero; line-height 1.4–1.6.

### Iconography & Motion
- Icon set: Phosphor or Lucide with consistent 16/20/24px stroke weight.
- Motion: Subtle 150–200ms ease-out transitions; respect reduced-motion preferences.

## Structure & Navigation
- Top navigation: Home, Question Templates, Guided Builder, Safety & Privacy, Learn, Sign in.
- Copy updates only: rename Prompt Library to "Question Templates" and Wizard to "Guided Builder".
- Footer: prominent disclaimers for informational use, HIPAA-conscious notice, legal links (Terms, Privacy, Contact).

## Roadmap Overview (3 Sprints)
### Sprint 1 — Brand Tokens & Core Components
- Define design tokens (color, spacing, radius, shadow, typography, motion) and wire into theme.
- Update core UI components: buttons, links, inputs, selects/comboboxes, cards, tabs, steppers, alerts, toasts, modals, tables, skeletons.
- Refresh global layout: header, footer, page background treatments, spacing rhythm.
- Deliverables: token spec, component style kit, font loading, icon usage guidelines.

### Sprint 2 — Page Polish (Question Templates & Guided Builder)
- Question Templates page: new hero copy, search + filter UX, card layout, empty/loading states, trust badges.
- Template detail: structured content (usage guidance, examples, safety tips, related templates) with "Open in Guided Builder" CTA.
- Guided Builder: stepper visuals, inline helper copy, live preview panel, copy/download feedback, PHI reminder banner.
- Deliverables: polished pages with consistent states, micro-interactions, copy wiring.

### Sprint 3 — Trust Content, Assets, QA
- Safety & Privacy page: HIPAA-conscious stance, PHI avoidance guidance, data handling, FAQ.
- Copy system: tone guide, labels, helper/error text, emergencies notice.
- Assets: logo refinement, favicon set, OG images, spot illustrations.
- Accessibility & QA: WCAG AA contrast, keyboard traversal, screen reader labels, reduced-motion support.
- Deliverables: trust page, asset pack, accessibility report, launch checklist, SEO metadata.

## Page-Specific Enhancements
### Question Templates
- Header: "Find question templates to ask safely." with supportive subtext.
- Search & Filters: category (Symptoms, Medications, Tests, Visits, Insurance), tone (Plain, Supportive), complexity (Basic, Advanced).
- Cards: title, single-line description, tags, updated date, safety badge, actions (Preview, Use in Guided Builder, Favorite).
- Detail view: full template, when to use, example answer framing, common mistakes, related templates, "Open in Guided Builder" CTA.
- States: skeleton loading, empty results suggestions.

### Guided Builder
- Step flow: Topic → Context (age, conditions, meds) → Tone → Constraints → Review.
- Live preview panel: realtime updates, copy confirmation feedback.
- PHI banner: "Don’t include names, addresses, or dates; keep it general." with icon.
- Review screen: final question text, talking-to-clinician tips, informational disclaimer.

## Copy & Messaging Guidelines
- Hero message: "Get clearer health answers—safely." Subhead: "Use guided templates to ask better questions without sharing personal health information." 
- Promises: "HIPAA-conscious design.", "We don’t want your PHI.", "Informational support, not medical advice." 
- Microcopy: Use patient-friendly verbs (learn, prepare, understand); labels 1–3 words; helper text ≤1 line; actionable error messages.
- Emergency cue: Persistent notice — "If this is an emergency, call your local emergency number."

## Trust, Privacy, Compliance
- Global disclaimer: informational only, not medical advice, no PHI collection.
- Safety & Privacy page: define PHI with examples, explain storage/logging stance, list third-party services, outline access controls, provide contact.
- Legal: Terms of Use, Privacy Policy; note analytics/cookie practices if applicable.

## Assets & SEO
- Logo: Blue/green wordmark (2D9CDB / 27AE60) plus MP cross icon; light/dark variants.
- Favicons & PWA icons: 16–512px set, maskable variant if needed.
- OG/Twitter images: blue-to-green gradient with warm accent details (F2C94C) and safety motif for home, templates, builder.
- Illustrations: three spot scenes (Templates, Guided Builder, Safety).
- SEO: page titles, meta descriptions, structured data where relevant; social share previews.

## Accessibility & QA Checklist
- AA contrast across text and interactive elements; focus ring contrast ≥3:1.
- Keyboard navigation through nav, cards, modals, steppers; visible focus.
- Proper ARIA roles/labels for steppers, modals, alerts, validation.
- Respect reduced-motion preferences; avoid flashing content.
- Validate with screen reader quick pass (VoiceOver/NVDA) and mobile tap targets.

## Success Metrics
- Trust engagement: percentage of users visiting Safety & Privacy page.
- Feature usage: conversion from template search to Guided Builder usage.
- UX quality: decreased backtracks, consistent copy usage.
- SEO lift: click-through rates on targeted health question pages.

## Dependencies & Decisions
- Confirm navigation labels and rename rollout timing.
- Approve disclaimers and HIPAA-conscious/no-PHI copy.
- Clarify analytics/cookie approach for footer notice.
- Provide domain/social/contact email for footer and support.
