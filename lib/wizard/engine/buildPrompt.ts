import { Answers, TriageTemplate } from "../schema/types";

export type PromptInputs = {
  template: TriageTemplate;
  answers: Answers;
  role: string;
  goal: string;
  redFlags: string[];
};

export const buildPrompt = ({
  template,
  answers,
  role,
  goal,
  redFlags,
}: PromptInputs): string => {
  const answerLines = template.questions.map((question) => {
    const value = answers[question.id];
    if (value === undefined || value === null || value === "") {
      return `- ${question.label}: (skipped)`;
    }
    if (Array.isArray(value)) {
      return `- ${question.label}: ${value.join(", ")}`;
    }
    return `- ${question.label}: ${String(value)}`;
  });

  const redFlagLines = redFlags.length > 0 ? redFlags : ["None noted based on answers."];

  return [
    `Prompt title: ${template.name} triage summary`,
    "Prompt body:",
    "1. Educational framing: You are an educational-only AI coach. No diagnosis. Encourage licensed care for decisions.",
    "2. Communication style: Plain language, check for understanding, invite follow-up questions.",
    "3. Safety guard: Remind the assistant not to collect or store identifiers (names, dates, record numbers).",
    `4. User role and goal: The user is a ${role}. Their immediate goal is ${goal}.`,
    "5. Structured answers to use as context:",
    ...answerLines,
    "6. Red flags already discussed. Emphasize when to seek care:",
    ...redFlagLines.map((line) => `   ${line}`),
    "7. Doctor prep checklist: Suggest 3-5 questions the user can bring to their clinician.",
    "8. Safety reminder: Encourage urgent care or emergency services if symptoms worsen or new red flags appear.",
    "",
    "Safety reminder: Educational use only — call 911 for emergencies.",
  ].join("\n");
};
