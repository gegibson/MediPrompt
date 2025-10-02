# MediPrompt Wizard — Build Roadmap (Wizard-Only)

## 0) Objectives & Non-Goals

### Objectives
- Keep Wizard at `app/wizard/page.tsx` and existing APIs.
- Enforce exactly one free completed triage per user/browser before paywall.
- Shift from single text form to template-driven structured flow (questions → red flags → output).
- Preserve all safety measures: PHI guard and disclaimers.
- Add subscriber-only Mode B: in-app educational guidance generation.

### Non-Goals
- No changes to landing page, library, pricing pages, or non-Wizard routes.
- No server-side storage of PHI or user answers in B2C mode.

## 1) Information Architecture & Files
```
lib/wizard/
  templates/                   # data-first templates (JSON or TS objects)
    chest_pain.ts
    headache.ts
    fever_adult.ts
    fever_peds.ts
    abdominal_pain.ts
    shortness_of_breath.ts
    medication_side_effects.ts
  schema/
    types.ts                   # TriageTemplate, Question, RedFlag, etc.
    blocks.ts                  # optional reusable QuestionBlocks
  engine/
    runner.ts                  # step engine: next question, branching
    redflags.ts                # evaluate red flags on answers
    buildPrompt.ts             # assembles copyable prompt (Mode A)
    buildGuidance.ts           # LLM request/response shaping (Mode B)
    sanitizer.ts               # PHI-safe text helpers
app/wizard/page.tsx            # UI (selector, question flow, output)
lib/safety/phiGuard.ts         # (existing) PHI detection
lib/analytics/track.ts         # (existing) Plausible wrapper
```

## 2) Data Model (Templates)

### 2.1 Types (`lib/wizard/schema/types.ts`)
```ts
export type InputKind = "text" | "select" | "multiselect" | "number" | "scale";

export type Question = {
  id: string;
  label: string;
  kind: InputKind;
  required?: boolean;
  options?: string[];     // for select/multiselect
  help?: string;
  showIf?: { field: string; equals: any };   // simple branching
};

export type RedFlagAction = "ER_NOW" | "URGENT_CARE" | "CALL_CLINIC" | "ADVICE_ONLY";

export type RedFlag = {
  id: string;
  description: string;                       // what to show user
  test: (a: Record<string, any>) => boolean; // pure function on answers
  action: RedFlagAction;
};

export type OutputSpec = {
  sections: Array<
    "title" | "summary" | "assessment_questions" |
    "red_flags" | "guidance" | "doctor_prep" | "safety_reminder"
  >;
};

export type TriageTemplate = {
  id: string;                 // e.g., "chest_pain_adult"
  name: string;               // "Chest Pain (Adult)"
  tags?: string[];
  questions: Question[];
  redFlags: RedFlag[];
  output: OutputSpec;
};
```

### 2.2 Starter Templates (`lib/wizard/templates/*.ts`)
- Chest Pain (Adult)
- Headache
- Fever (Adult)
- Fever (Pediatric)
- Abdominal Pain
- Shortness of Breath
- Medication: Side Effects / Missed Dose

Each template includes ordered questions, red-flag tests, and a standard `output.sections` layout.

## 3) UI/UX Flow (Single Page)

### 3.1 Selector & Status
- Replace free-text topic with template selector (dropdown/search).
- Keep Role (Patient / Caregiver) and Goal (Learn basics / Prepare questions / Understand results).
- Free-use banner logic:
  - Eligible: “You have 1 free tailored triage.”
  - Consumed: show paywall card and primary action becomes “Subscribe to unlock”.

### 3.2 Question Flow
- Render one question at a time with progress indicator (e.g., “3 of 8”).
- Support input types: text, select, multiselect, number/scale.
- After each answer:
  - Save to local state.
  - Evaluate red flags (Section 4).
  - Apply `showIf` branching for next question.

### 3.3 Completion & Output
- When all required questions complete and no `ER_NOW` flag:
  - Mode A (default): show copyable prompt from `buildPrompt.ts`.
  - Mode B (subscriber toggle): “Generate Educational Guidance Here” using `buildGuidance.ts` and render sections inline.
- Include copy button for each output mode.
- Mark free-use consumption after a successful result for non-subscribers.

### 3.4 Popups
- PHI guard modal before showing results if identifiers detected: “Edit & Resubmit” (default) or “Continue anyway”.
- Existing auth modal when checkout clicked while logged out.

## 4) Red-Flag Interceptor
- After each answer, run `lib/wizard/engine/redflags.ts` for active template.
- On `ER_NOW` trigger:
  - Interrupt flow with emergency card: “⚠️ Your answers suggest a potential emergency. Call 911 now.”
  - Show brief educational notes (no diagnosis) and `Reset` button.
  - Do not call AI.
- For lower-acuity flags (`URGENT_CARE`, etc.), continue flow and surface in final results.

## 5) Output Builders

### 5.1 Mode A — Copyable Prompt (`lib/wizard/engine/buildPrompt.ts`)
- Inputs: template, answers, role, goal.
- Produce single formatted text block with sections: Title, Summary of answers, Red flags to watch, Guidance, Doctor-prep checklist, Safety reminder.
- Reinforce “no identifiers” instruction within prompt.

### 5.2 Mode B — Educational Guidance (`lib/wizard/engine/buildGuidance.ts`)
- Inputs: template, answers, role, goal.
- Compose strict system + user payload to ensure same sections, no diagnosis, educational tone, safety disclaimers.
- Render returned sections inline (not a chat). Include copy option.

## 6) Gating & Subscription
- Maintain `mp-wizard-preview-used-${userId|anon}` free preview flag.
- Rules:
  - Not logged in + not used → allow one free triage.
  - Not logged in + used → require sign-in (auth modal).
  - Logged in, non-subscriber, not used → one free triage.
  - Logged in, non-subscriber, used → show paywall card + checkout CTA.
  - Subscriber → unlimited access.
- Optional: persist `free_preview_consumed` in Supabase user profile to close multi-device gap.
- Updated UI copy:
  - Eligible submit: “Generate my tailored triage result”.
  - Ineligible submit: “Subscribe to unlock”.
  - Paywall bullets: “Unlimited triage • Advanced categories • In-app educational guidance • No ads”.

## 7) PHI Guard Enhancements
- Keep `lib/safety/phiGuard.ts` integration.
- Before displaying results:
  - If PHI flagged → show modal with “Edit & Resubmit” (default) and “Continue anyway”.
  - Return focus to active field on edit path.
- Add “Sanitize” link under large text inputs to replace names/dates/ID-like numbers with placeholders (`[name]`, `[date]`, `[number]`).

## 8) Disclaimers
- Retain existing footer/legal links.
- Add static banner under form: “Educational use only — not medical advice. Don’t include personal identifiers. In emergencies, call 911.”
- Ensure every output (Modes A & B) ends with safety reminder block.

## 9) Analytics (Plausible)
- Keep existing events:
  - `wizard_prompt_generated`
  - `wizard_prompt_copied`
  - `wizard_free_preview_consumed`
  - `wizard_paywall_viewed`, `wizard_paywall_cta_click`
  - Auth/Profile/Stripe confirm events
- Add new events:
  - `wizard_template_selected` `{ template_id }`
  - `wizard_question_answered` `{ template_id, qid }` (sampled or final question only)
  - `wizard_redflag_triggered` `{ template_id, level: "ER_NOW" | "URGENT_CARE" | ... }`
  - `wizard_result_shown` `{ template_id, mode: "prompt" | "guidance" }`
  - `wizard_submit_blocked` `{ reason: "anon_login_required" | "paywall" }`
- Ensure `?debug=events` logs new events.

## 10) QA Checklist
- **Automated coverage:** `npm run test:wizard` runs the wizard-focused test suite (red flags, PHI guard, gating, prompt/guidance builders, API fallback). The suite executes in CI via `.github/workflows/wizard-tests.yml` on any wizard-related change. Treat failing checks as release blockers.
- **Gating:**
  - Cold anon → complete one triage → next attempt blocked.
  - Logged-in non-subscriber → one triage → paywall thereafter.
  - Subscriber → unlimited; free flag cleared.
- **Red flags:**
  - `ER_NOW` shows emergency card, no AI call, Reset works.
  - Non-ER red flags appear in result “Watch for” section.
- **PHI:**
  - Flagged text triggers modal; both actions functional; sanitize helper replaces patterns.
- **Output:**
  - Mode A prompt includes all sections; copy works.
  - Mode B guidance returns same sections; copy works; no diagnosis language.
- **Stripe:**
  - Success → `is_subscriber=true`, Wizard reloads, paywall removed.
  - Cancel → URL cleaned, state restored.
- **Performance:**
  - Templates lazy-loaded; no console errors; smooth transitions.
- **Accessibility:**
  - Keyboard traversal through questions; clear focus states; ARIA labels for buttons and modal.

## 11) Implementation Steps (Sequenced)
1. Scaffold schema and starter templates (`lib/wizard/schema/types.ts`, `lib/wizard/templates/*.ts`).
2. Build question flow UI (template selector, step-by-step questions, progress label).
3. Implement red-flag evaluator (`lib/wizard/engine/redflags.ts`) and emergency interrupt card.
4. Implement output builders (`buildPrompt.ts`, `buildGuidance.ts`) and render paths.
5. Tighten gating logic and UI copy; track free-use consumption.
6. Enhance PHI guard modal and sanitize helper.
7. Add analytics events and ensure debug logging.
8. QA regression across anon/non-sub/sub, ER vs non-ER, PHI scenarios.
9. Rollout with `NEXT_PUBLIC_WIZARD_V2` flag (internal → 10% → 100%) and monitor funnel.

## 12) Starter Acceptance Criteria
- User selects Chest Pain template, answers ~8 questions, receives structured result.
- ER-level red flag (e.g., crushing pressure + sweating) stops flow with emergency card.
- Non-ER red flags appear in result “Watch for” section.
- One free triage per user/browser before paywall activates.
- Subscriber toggle exposes “Generate Educational Guidance Here” and returns on-page sections.
- PHI guard modal triggers on identifiers; sanitize helper functions.
- Every result ends with safety disclaimer.
- New analytics events fire and appear in debug mode.
