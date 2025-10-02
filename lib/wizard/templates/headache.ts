import { TriageTemplate } from "../schema/types";

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const asNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const multiIncludes = (value: unknown, match: string) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).toLowerCase()).includes(match.toLowerCase());
  }
  if (typeof value === "string") {
    return value.toLowerCase() === match.toLowerCase();
  }
  return false;
};

const headacheTemplate: TriageTemplate = {
  id: "headache_general",
  name: "Headache",
  tags: ["neurology", "adult"],
  questions: [
    {
      id: "onset_timing",
      label: "When did the headache start?",
      kind: "text",
      required: true,
    },
    {
      id: "sudden_onset",
      label: "Did the headache reach peak intensity within a minute (thunderclap)?",
      kind: "select",
      required: true,
      options: ["No", "Yes", "Unsure"],
    },
    {
      id: "pain_severity",
      label: "How intense is it on a 1-10 scale?",
      kind: "scale",
      required: true,
    },
    {
      id: "pattern",
      label: "Is this a new headache or similar to prior headaches?",
      kind: "select",
      required: true,
      options: ["New", "Similar to previous", "Worse than previous"],
    },
    {
      id: "neuro_symptoms",
      label: "Any neurologic symptoms?",
      kind: "multiselect",
      required: true,
      options: [
        "Weakness",
        "Numbness",
        "Speech changes",
        "Vision changes",
        "Confusion",
        "Seizure",
        "None",
      ],
    },
    {
      id: "infection_signs",
      label: "Any fever, neck stiffness, or rash?",
      kind: "multiselect",
      options: ["Fever", "Neck stiffness", "Rash", "None"],
    },
    {
      id: "injury",
      label: "Recent head injury or fall?",
      kind: "select",
      options: ["No", "Yes", "Unsure"],
    },
    {
      id: "pregnancy",
      label: "Are you pregnant or postpartum (within 6 weeks)?",
      kind: "select",
      options: ["No", "Yes", "Unsure", "Not applicable"],
    },
    {
      id: "medications",
      label: "Current medications or blood thinners?",
      kind: "text",
    },
  ],
  redFlags: [
    {
      id: "er_thunderclap",
      description: "Sudden thunderclap headache reaching peak intensity within a minute.",
      action: "ER_NOW",
      test: (answers) => asString(answers["sudden_onset"]) === "Yes",
    },
    {
      id: "er_neuro",
      description: "Headache with new neurologic symptoms (weakness, speech, vision, confusion, seizure).",
      action: "ER_NOW",
      test: (answers) => {
        const value = answers["neuro_symptoms"];
        if (!Array.isArray(value)) {
          return false;
        }
        return value.some((item) => String(item) !== "None");
      },
    },
    {
      id: "urgent_infection",
      description: "Headache with fever or neck stiffness could signal infection.",
      action: "URGENT_CARE",
      test: (answers) =>
        multiIncludes(answers["infection_signs"], "Fever") ||
        multiIncludes(answers["infection_signs"], "Neck stiffness"),
    },
    {
      id: "pregnancy_flag",
      description: "Headache during pregnancy or postpartum needs medical review.",
      action: "CALL_CLINIC",
      test: (answers) => asString(answers["pregnancy"]) === "Yes",
    },
    {
      id: "severe_scale",
      description: "Severe headache intensity 8 or higher.",
      action: "CALL_CLINIC",
      test: (answers) => {
        const severity = asNumber(answers["pain_severity"]);
        return typeof severity === "number" && severity >= 8;
      },
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

export default headacheTemplate;
