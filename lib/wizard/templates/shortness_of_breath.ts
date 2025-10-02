import { Answers, TriageTemplate } from "../schema/types";

const includesOption = (answers: Answers, field: string, expected: string) => {
  const value = answers[field];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).toLowerCase()).includes(expected.toLowerCase());
  }
  if (typeof value === "string") {
    return value.toLowerCase() === expected.toLowerCase();
  }
  return false;
};

const shortnessOfBreathTemplate: TriageTemplate = {
  id: "shortness_of_breath",
  name: "Shortness of Breath",
  tags: ["respiratory", "adult"],
  questions: [
    {
      id: "onset",
      label: "When did the breathing difficulty start?",
      kind: "select",
      required: true,
      options: ["Suddenly", "Within the last day", "1-3 days", "More than 3 days"],
    },
    {
      id: "severity",
      label: "How hard is it to breathe (1 = mild, 10 = cannot catch breath)?",
      kind: "scale",
      required: true,
    },
    {
      id: "rest_or_activity",
      label: "Does it occur at rest, with activity, or both?",
      kind: "select",
      required: true,
      options: ["Only with activity", "Mostly with activity, some at rest", "Even at rest"],
    },
    {
      id: "speech",
      label: "Can you speak in full sentences?",
      kind: "select",
      required: true,
      options: ["Yes", "Only short phrases", "Barely at all"],
    },
    {
      id: "associated_symptoms",
      label: "Any of these symptoms?",
      kind: "multiselect",
      options: [
        "Chest pain",
        "Chest tightness",
        "Wheezing",
        "Cough",
        "Fever",
        "Bluish lips or nails",
        "Swelling in legs",
        "None",
      ],
    },
    {
      id: "history",
      label: "Do you have these conditions?",
      kind: "multiselect",
      options: ["Asthma", "COPD", "Heart failure", "Blood clot", "None"],
    },
    {
      id: "triggers",
      label: "Any known triggers (exercise, allergens, anxiety)?",
      kind: "text",
    },
    {
      id: "oxygen_use",
      label: "Do you use home oxygen or inhalers?",
      kind: "select",
      options: ["No", "Yes - oxygen", "Yes - inhaler", "Both", "Unsure"],
    },
  ],
  redFlags: [
    {
      id: "er_rest",
      description: "Shortness of breath at rest with inability to speak in full sentences.",
      action: "ER_NOW",
      test: (answers) =>
        answers["rest_or_activity"] === "Even at rest" &&
        (answers["speech"] === "Only short phrases" || answers["speech"] === "Barely at all"),
    },
    {
      id: "er_bluish",
      description: "Bluish lips or nails suggest low oxygen.",
      action: "ER_NOW",
      test: (answers) => includesOption(answers, "associated_symptoms", "Bluish lips or nails"),
    },
    {
      id: "urgent_chestpain",
      description: "Breathing difficulty with chest pain or tightness.",
      action: "URGENT_CARE",
      test: (answers) =>
        includesOption(answers, "associated_symptoms", "Chest pain") ||
        includesOption(answers, "associated_symptoms", "Chest tightness"),
    },
    {
      id: "clinic_history",
      description: "Known heart failure or blood clot history warrants clinician guidance.",
      action: "CALL_CLINIC",
      test: (answers) =>
        includesOption(answers, "history", "Heart failure") || includesOption(answers, "history", "Blood clot"),
    },
    {
      id: "clinic_wheezing",
      description: "Recurrent wheezing may benefit from asthma/COPD management plan review.",
      action: "CALL_CLINIC",
      test: (answers) => includesOption(answers, "associated_symptoms", "Wheezing"),
    },
  ],
  output: {
    sections: [
      "title",
      "summary",
      "assessment_questions",
      "red_flags",
      "guidance",
      "doctor_prep",
      "safety_reminder",
    ],
  },
};

export default shortnessOfBreathTemplate;
