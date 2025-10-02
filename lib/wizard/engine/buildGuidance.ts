import { Answers, TriageTemplate } from "../schema/types";

export type GuidanceInputs = {
  template: TriageTemplate;
  answers: Answers;
  role: string;
  goal: string;
  redFlags: string[];
};

export type GuidanceSections = {
  title: string;
  summary: string;
  watch_for: string[];
  guidance: string[];
  doctor_prep: string[];
  safety_reminder: string;
};

export type GuidancePlan = {
  systemPrompt: string;
  userPrompt: string;
  responseFormat: {
    type: "json_schema";
    json_schema: {
      name: string;
      schema: Record<string, unknown>;
    };
  };
  fallback: GuidanceSections;
};

const stringifyAnswers = (template: TriageTemplate, answers: Answers) => {
  return template.questions
    .map((question) => {
      const value = answers[question.id];
      if (value === undefined || value === null || value === "") {
        return `- ${question.label}: (skipped)`;
      }
      if (Array.isArray(value)) {
        return `- ${question.label}: ${value.join(", ")}`;
      }
      return `- ${question.label}: ${String(value)}`;
    })
    .join("\n");
};

const guidanceSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "summary",
    "watch_for",
    "guidance",
    "doctor_prep",
    "safety_reminder",
  ],
  properties: {
    title: {
      type: "string",
      description: "Short, reassuring title (max 120 characters).",
      maxLength: 120,
    },
    summary: {
      type: "string",
      description: "Two to three sentence plain-language overview of the situation.",
      maxLength: 800,
    },
    watch_for: {
      type: "array",
      description: "Bulleted signs and symptoms that should trigger escalation.",
      minItems: 1,
      items: {
        type: "string",
        maxLength: 240,
      },
    },
    guidance: {
      type: "array",
      description: "Bullet list of educational steps and self-care tips.",
      minItems: 1,
      items: {
        type: "string",
        maxLength: 320,
      },
    },
    doctor_prep: {
      type: "array",
      description: "Bullet list of questions or details to share with clinicians.",
      minItems: 1,
      items: {
        type: "string",
        maxLength: 240,
      },
    },
    safety_reminder: {
      type: "string",
      description:
        "One-sentence reminder that this is not medical advice and to seek emergency care when needed.",
      maxLength: 240,
    },
  },
};

const buildFallbackSections = (
  template: TriageTemplate,
  redFlags: string[],
): GuidanceSections => {
  const watchList = redFlags.length > 0 ? redFlags : ["No additional red flags identified during this triage."];

  return {
    title: `${template.name} — Guidance Preview`,
    summary:
      "We were unable to generate educational guidance automatically. Review the notes below and contact a licensed clinician for specific advice.",
    watch_for: watchList,
    guidance: [
      "Use the summary and doctor-prep checklist to organize your next clinical conversation.",
      "If symptoms escalate or new red flags appear, seek urgent care or emergency services.",
    ],
    doctor_prep: [
      "Record when symptoms started, how they changed, and any self-care tried.",
      "List current medications, allergies, and relevant medical history to share with the clinician.",
    ],
    safety_reminder: "Educational use only — for emergencies call 911 or your local emergency number.",
  };
};

export const buildGuidance = ({
  template,
  answers,
  role,
  goal,
  redFlags,
}: GuidanceInputs): GuidancePlan => {
  const answerText = stringifyAnswers(template, answers);
  const redFlagText = redFlags.length > 0 ? redFlags.join("\n") : "None noted based on answers.";

  const systemPrompt = [
    "You are an experienced nurse educator and triage coach.",
    "Provide educational guidance only; never diagnose or prescribe.",
    "Use calm, plain-language explanations with bullet lists when helpful.",
    "Always remind the user not to share personal identifiers and to seek licensed care for decisions.",
    "Stay concise. Prefer numbered or bulleted lists for action steps.",
  ].join("\n");

  const userPrompt = [
    `Role: ${role}. Immediate goal: ${goal}.`,
    "Patient answers:",
    answerText,
    "",
    "Red flags already highlighted:",
    redFlagText,
    "",
    "Return a JSON object with keys title, summary, watch_for, guidance, doctor_prep, safety_reminder.",
    "watch_for, guidance, and doctor_prep must each be arrays of 2-5 short bullet strings.",
    "Summaries must stay educational, avoid diagnoses, and remind users to seek licensed care.",
    "Mention emergency services when symptoms are severe or new red flags appear.",
  ].join("\n");

  return {
    systemPrompt,
    userPrompt,
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "wizard_guidance",
        schema: guidanceSchema,
      },
    },
    fallback: buildFallbackSections(template, redFlags),
  };
};

export const formatGuidanceForCopy = (sections: GuidanceSections): string => {
  return [
    `Title: ${sections.title}`,
    "",
    `Summary: ${sections.summary}`,
    "",
    "Watch for:",
    ...sections.watch_for.map((item) => `- ${item}`),
    "",
    "Guidance:",
    ...sections.guidance.map((item) => `- ${item}`),
    "",
    "Doctor prep:",
    ...sections.doctor_prep.map((item) => `- ${item}`),
    "",
    `Safety reminder: ${sections.safety_reminder}`,
  ].join("\n");
};
