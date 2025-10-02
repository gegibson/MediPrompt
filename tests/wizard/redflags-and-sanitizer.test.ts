import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

import { determineWizardAccess } from "@/lib/wizard/engine/access";
import {
  deriveCallToActionLabel,
  type WizardCtaContext,
} from "@/lib/wizard/engine/callToAction";
import { buildPrompt } from "@/lib/wizard/engine/buildPrompt";
import { buildGuidance, type GuidanceSections } from "@/lib/wizard/engine/buildGuidance";
import { POST as guidanceRoute } from "@/app/api/wizard/guidance/route";
import { evaluateRedFlags } from "@/lib/wizard/engine/redflags";
import { sanitizeFreeText } from "@/lib/wizard/engine/sanitizer";
import {
  getPreviewStorageKey,
  readPreviewUsage,
  writePreviewUsage,
} from "@/lib/wizard/storage/previewFlag";
import {
  computeVisibleQuestions,
  pruneHiddenAnswers,
} from "@/lib/wizard/engine/questions";
import type { Answers, TriageTemplate } from "@/lib/wizard/schema/types";
import { wizardTemplates } from "@/lib/wizard/templates";

describe("wizard red flag evaluation", () => {
  it("flags ER-level emergencies when high-risk chest pain symptoms align", () => {
    const template = wizardTemplates["chest_pain_adult"];
    assert.ok(template, "chest pain template should be available");

    const answers = {
      pain_severity: 9,
      pain_quality: "Pressure/Crushing",
      pain_radiation: ["Left arm"],
      associated_symptoms: ["Sweating", "Shortness of breath"],
      cardiac_history: "No",
      risk_factors: ["None"],
    };

    const result = evaluateRedFlags(template, answers);

    assert.equal(result.emergency.length, 1, "should surface a single ER_NOW flag");
    assert.equal(result.emergency[0]?.action, "ER_NOW");
    assert.ok(
      result.emergency[0]?.description.includes("Severe pressure"),
      "flag description should mention the severe pressure guidance",
    );
    assert.equal(result.nonEmergency.length, 0, "no lower-acuity flags expected in this scenario");
  });

  it("surfaces non-emergent follow-up guidance when history suggests elevated risk", () => {
    const template = wizardTemplates["chest_pain_adult"];
    assert.ok(template, "chest pain template should be available");

    const answers = {
      pain_severity: 5,
      pain_quality: "Tightness",
      pain_radiation: ["No spreading"],
      associated_symptoms: ["None of these"],
      cardiac_history: "Yes - heart disease",
      risk_factors: ["Diabetes", "High blood pressure"],
    };

    const result = evaluateRedFlags(template, answers);

    assert.equal(result.emergency.length, 0, "should not trigger ER_NOW for moderate symptoms");
    assert.equal(result.nonEmergency.length, 2, "should capture urgent care plus clinic guidance");
    const actions = result.nonEmergency.map((flag) => flag.action).sort();
    assert.deepEqual(actions, ["CALL_CLINIC", "URGENT_CARE"].sort());
  });
});

describe("wizard PHI sanitizer", () => {
  it("replaces names, dates, and long numbers with neutral placeholders", () => {
    const input = "John Doe met with cardiology on 03/14/2020 and MRN 12345678";
    const sanitized = sanitizeFreeText(input);

    assert.match(sanitized, /\[name]\s+met/i);
    assert.match(sanitized, /\[date]/);
    assert.match(sanitized, /\[number]/);
  });

  it("preserves generic words, pronouns, and weekdays", () => {
    const input = "She felt better on Monday after visiting the clinic";
    const sanitized = sanitizeFreeText(input);

    assert.equal(sanitized, input, "common words and weekdays should remain untouched");
  });
});

describe("wizard access gating", () => {
  it("grants unlimited access to subscribers regardless of preview usage", () => {
    const access = determineWizardAccess({
      isSubscriber: true,
      freePreviewUsed: true,
      isLoggedIn: true,
    });

    assert.equal(access.state, "subscriber");
    assert.equal(access.canGenerate, true);
  });

  it("allows one free preview for non-subscribers before blocking", () => {
    const eligible = determineWizardAccess({
      isSubscriber: false,
      freePreviewUsed: false,
      isLoggedIn: false,
    });

    assert.equal(eligible.state, "free_eligible");
    assert.equal(eligible.canGenerate, true);

    const anonBlocked = determineWizardAccess({
      isSubscriber: false,
      freePreviewUsed: true,
      isLoggedIn: false,
    });

    assert.equal(anonBlocked.state, "anon_blocked");
    assert.equal(anonBlocked.canGenerate, false);
    assert.equal(anonBlocked.requiresAuth, true);
    assert.equal(anonBlocked.reason, "anon-login");

    const paywallBlocked = determineWizardAccess({
      isSubscriber: false,
      freePreviewUsed: true,
      isLoggedIn: true,
    });

    assert.equal(paywallBlocked.state, "paywall_blocked");
    assert.equal(paywallBlocked.canGenerate, false);
    assert.equal(paywallBlocked.requiresAuth, false);
    assert.equal(paywallBlocked.reason, "paywall");
  });
});

describe("wizard preview storage", () => {
  const makeStorage = () => {
    const state = new Map<string, string>();
    return {
      getItem: (key: string) => state.get(key) ?? null,
      setItem: (key: string, value: string) => {
        state.set(key, value);
      },
      removeItem: (key: string) => {
        state.delete(key);
      },
      dump: () => Object.fromEntries(state.entries()),
    };
  };

  it("builds stable keys for anon and logged-in users", () => {
    assert.equal(getPreviewStorageKey(undefined), "mp-wizard-preview-used-anon");
    assert.equal(getPreviewStorageKey("123"), "mp-wizard-preview-used-123");
  });

  it("stores and clears the preview flag reliably", () => {
    const storage = makeStorage();
    const key = getPreviewStorageKey("user-1");

    assert.equal(readPreviewUsage(storage, key), false);

    writePreviewUsage(storage, key, true);
    assert.equal(readPreviewUsage(storage, key), true);
    assert.deepEqual(storage.dump(), { [key]: "1" });

    writePreviewUsage(storage, key, false);
    assert.equal(readPreviewUsage(storage, key), false);
    assert.deepEqual(storage.dump(), {});
  });
});

describe("wizard CTA labels", () => {
  const baseContext = (): WizardCtaContext => ({
    authLoading: false,
    profileLoading: false,
    isConfirmingSubscription: false,
    isCreatingCheckout: false,
    isSubscriber: false,
    freePreviewUsed: false,
    isEmergencyStop: false,
    hasTemplate: true,
    hasQuestions: true,
    isFlowComplete: false,
    isOnLastQuestion: false,
  });

  const label = (overrides: Partial<WizardCtaContext> = {}) =>
    deriveCallToActionLabel({ ...baseContext(), ...overrides });

  it("shows loading copy while auth or profile state resolves", () => {
    assert.equal(label({ authLoading: true }), "Checking access...");
    assert.equal(label({ profileLoading: true }), "Checking access...");
  });

  it("communicates subscription status transitions", () => {
    assert.equal(label({ isConfirmingSubscription: true }), "Unlocking subscription...");
    assert.equal(label({ isCreatingCheckout: true }), "Opening Stripe...");
  });

  it("prompts for subscription after free preview usage", () => {
    assert.equal(label({ freePreviewUsed: true }), "Subscribe to unlock");
  });

  it("uses emergency copy when red flags require a stop", () => {
    assert.equal(label({ isEmergencyStop: true }), "Emergency detected");
  });

  it("encourages starting the flow until a template is ready", () => {
    assert.equal(label({ hasTemplate: false }), "Start triage");
    assert.equal(label({ hasQuestions: false }), "Start triage");
  });

  it("indicates update state once the flow has completed", () => {
    assert.equal(label({ isFlowComplete: true }), "Update triage result");
  });

  it("switches between next-question and final-generate labels", () => {
    assert.equal(label({ isOnLastQuestion: true }), "Generate my tailored triage result");
    assert.equal(label({ isOnLastQuestion: false }), "Next question");
  });
});

describe("wizard question flow helpers", () => {
  const template: TriageTemplate = {
    id: "test_template",
    name: "Test Template",
    questions: [
      {
        id: "chief_complaint",
        label: "What brought you in today?",
        kind: "select",
        required: true,
        options: ["pain", "fever"],
      },
      {
        id: "pain_location",
        label: "Where is the pain located?",
        kind: "text",
        showIf: { field: "chief_complaint", equals: "pain" },
      },
      {
        id: "fever_duration",
        label: "How long has the fever lasted?",
        kind: "text",
        showIf: { field: "chief_complaint", equals: "fever" },
      },
      {
        id: "injury_follow_up",
        label: "Describe the injury details",
        kind: "text",
        showIf: { field: "associated_symptoms", equals: "injury" },
      },
      {
        id: "associated_symptoms",
        label: "Select any matching symptoms",
        kind: "multiselect",
        options: ["injury", "rash", "nausea"],
      },
    ],
    redFlags: [],
    output: { sections: ["summary"] },
  };

  it("filters follow-up questions based on showIf conditions", () => {
    const painAnswers: Answers = { chief_complaint: "pain" };
    const visibleForPain = computeVisibleQuestions(template, painAnswers);
    assert.deepEqual(
      visibleForPain.map((q) => q.id),
      ["chief_complaint", "pain_location", "associated_symptoms"],
      "pain follow-up should reveal the pain question while skipping hidden injury details",
    );

    const feverAnswers: Answers = { chief_complaint: "fever" };
    const visibleForFever = computeVisibleQuestions(template, feverAnswers);
    assert.deepEqual(
      visibleForFever.map((q) => q.id),
      ["chief_complaint", "fever_duration", "associated_symptoms"],
      "fever follow-up should show fever question but not pain location or injury details",
    );

    const injuryAnswers: Answers = {
      chief_complaint: "pain",
      associated_symptoms: ["rash", "injury"],
    };
    const visibleWithInjury = computeVisibleQuestions(template, injuryAnswers);
    assert.ok(
      visibleWithInjury.some((q) => q.id === "injury_follow_up"),
      "injury follow-up should appear when multiselect includes injury",
    );
  });

  it("removes answers that belong to hidden follow-up questions", () => {
    const answers: Answers = {
      chief_complaint: "fever",
      pain_location: "chest",
      fever_duration: "3 days",
      associated_symptoms: ["rash"],
      injury_follow_up: "old notes",
    };

    const pruned = pruneHiddenAnswers(template, answers);
    assert.deepEqual(pruned, {
      chief_complaint: "fever",
      fever_duration: "3 days",
      associated_symptoms: ["rash"],
    });
  });
});

describe("wizard prompt builder", () => {
  const promptTemplate: TriageTemplate = {
    id: "prompt_template",
    name: "Prompt Template",
    questions: [
      {
        id: "primary_concern",
        label: "What is the primary concern?",
        kind: "text",
        required: true,
      },
      {
        id: "duration",
        label: "How long has this been an issue?",
        kind: "text",
      },
    ],
    redFlags: [],
    output: { sections: ["summary"] },
  };

  it("formats answers, red flags, and reminders into the prompt output", () => {
    const prompt = buildPrompt({
      template: promptTemplate,
      answers: {
        primary_concern: "Chest tightness",
        duration: "Started yesterday",
      },
      role: "patient",
      goal: "Understand next steps",
      redFlags: ["Call emergency services if pain worsens"],
    });

    assert.match(prompt, /Prompt title: Prompt Template triage summary/);
    assert.match(prompt, /The user is a patient/);
    assert.match(prompt, /- What is the primary concern\?: Chest tightness/);
    assert.match(prompt, /Call emergency services if pain worsens/);
    assert.match(prompt, /Safety reminder: Educational use only/);
  });

  it("marks unanswered questions and defaults red flags when empty", () => {
    const prompt = buildPrompt({
      template: promptTemplate,
      answers: {
        primary_concern: "Headache",
      },
      role: "caregiver",
      goal: "Prepare clinician questions",
      redFlags: [],
    });

    assert.match(prompt, /- How long has this been an issue\?: \(skipped\)/);
    assert.match(prompt, /None noted based on answers\./);
  });
});

describe("wizard guidance builder", () => {
  const guidanceTemplate: TriageTemplate = {
    id: "guidance_template",
    name: "Guidance Template",
    questions: [
      {
        id: "chief",
        label: "Chief concern",
        kind: "text",
      },
      {
        id: "symptoms",
        label: "Describe any other symptoms",
        kind: "multiselect",
      },
    ],
    redFlags: [],
    output: { sections: ["summary"] },
  };

  it("produces a structured payload with schema enforcement", () => {
    const plan = buildGuidance({
      template: guidanceTemplate,
      answers: {
        chief: "Shortness of breath",
        symptoms: ["wheezing", "fatigue"],
      },
      role: "patient",
      goal: "Learn breathing exercises",
      redFlags: ["Seek emergency care if breathing worsens"],
    });

    assert.equal(plan.responseFormat.type, "json_schema");
    assert.ok(plan.responseFormat.json_schema?.schema);
    assert.match(plan.systemPrompt, /experienced nurse educator/);
    assert.match(plan.userPrompt, /Role: patient/);
    assert.match(plan.userPrompt, /Seek emergency care/);
    assert.match(plan.userPrompt, /Return a JSON object/);
  });

  it("falls back to educational guidance when LLM is unavailable", () => {
    const plan = buildGuidance({
      template: guidanceTemplate,
      answers: { chief: "Throat pain" },
      role: "caregiver",
      goal: "Prepare clinician questions",
      redFlags: [],
    });

    assert.match(plan.fallback.title, /Guidance Template/);
    assert.match(plan.fallback.summary, /unable to generate educational guidance/);
    assert.ok(
      plan.fallback.watch_for.some((item) =>
        item.includes("No additional red flags identified"),
      ),
    );
    assert.ok(plan.fallback.guidance[0]?.includes("summary"));
    assert.match(plan.fallback.safety_reminder, /Educational use only/);
  });
});

describe("wizard guidance route", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  const buildRequest = (payload: Record<string, unknown>) =>
    new Request("http://localhost/api/wizard/guidance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  it("returns fallback sections when the model key is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const request = buildRequest({
      templateId: "chest_pain_adult",
      answers: { role: "Myself" },
      role: "patient",
      goal: "Understand basics",
      redFlags: ["Seek emergency care if symptoms escalate"],
    });

    const response = await guidanceRoute(request);
    assert.equal(response.status, 501);

    const json = (await response.json()) as {
      error: string;
      sections: GuidanceSections;
      payload: { model: string | null };
    };

    assert.match(json.error, /not configured/);
    assert.equal(json.payload.model, null);
    assert.match(json.sections.title, /Chest Pain/);
    assert.match(json.sections.safety_reminder, /Educational use only/);
  });

  it("rejects unknown template identifiers", async () => {
    delete process.env.OPENAI_API_KEY;

    const request = buildRequest({
      templateId: "unknown_template",
      answers: {},
      role: "patient",
      goal: "Test",
    });

    const response = await guidanceRoute(request);
    assert.equal(response.status, 404);
    const json = (await response.json()) as { error: string };
    assert.match(json.error, /Unknown triage template/);
  });
});
