import { Answers, TriageTemplate } from "../schema/types";

const toNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const hasOption = (answers: Answers, field: string, expected: string) => {
  const value = answers[field];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).toLowerCase()).includes(expected.toLowerCase());
  }
  if (typeof value === "string") {
    return value.toLowerCase() === expected.toLowerCase();
  }
  return false;
};

const feverAdultTemplate: TriageTemplate = {
  id: "fever_adult",
  name: "Fever (Adult)",
  tags: ["infection", "adult"],
  questions: [
    {
      id: "temperature_peak",
      label: "What is the highest temperature you've measured (°F or °C)?",
      kind: "number",
      required: true,
    },
    {
      id: "temperature_unit",
      label: "Which unit did you use?",
      kind: "select",
      required: true,
      options: ["Fahrenheit", "Celsius"],
    },
    {
      id: "duration",
      label: "How long have you had the fever?",
      kind: "select",
      required: true,
      options: ["Less than 24 hours", "1-3 days", "More than 3 days"],
    },
    {
      id: "symptoms",
      label: "Any of the following symptoms?",
      kind: "multiselect",
      options: [
        "Stiff neck",
        "Severe headache",
        "Shortness of breath",
        "Chest pain",
        "Persistent vomiting",
        "Rash",
        "Confusion",
        "None",
      ],
      required: true,
    },
    {
      id: "chronic_conditions",
      label: "Do you have any of these conditions?",
      kind: "multiselect",
      options: [
        "Diabetes",
        "Kidney disease",
        "Lung disease",
        "Immune suppression",
        "Cancer treatment",
        "None",
      ],
    },
    {
      id: "recent_travel",
      label: "Have you traveled internationally in the last month?",
      kind: "select",
      options: ["No", "Yes", "Unsure"],
    },
    {
      id: "pregnancy",
      label: "Could you be pregnant?",
      kind: "select",
      options: ["No", "Yes", "Unsure", "Not applicable"],
    },
    {
      id: "medications",
      label: "Any medications taken for the fever?",
      kind: "text",
    },
  ],
  redFlags: [
    {
      id: "er_high_temp",
      description: "Very high fever (≥103°F / 39.4°C).",
      action: "ER_NOW",
      test: (answers) => {
        const measured = toNumber(answers["temperature_peak"]);
        const unit = typeof answers["temperature_unit"] === "string" ? answers["temperature_unit"] : "";
        if (typeof measured !== "number") {
          return false;
        }
        if (unit === "Celsius") {
          return measured >= 39.4;
        }
        return measured >= 103;
      },
    },
    {
      id: "er_confusion",
      description: "Fever with new confusion or difficulty staying awake.",
      action: "ER_NOW",
      test: (answers) => hasOption(answers, "symptoms", "Confusion"),
    },
    {
      id: "urgent_stiffneck",
      description: "Fever with stiff neck or severe headache.",
      action: "URGENT_CARE",
      test: (answers) =>
        hasOption(answers, "symptoms", "Stiff neck") || hasOption(answers, "symptoms", "Severe headache"),
    },
    {
      id: "clinic_immunocompromised",
      description: "Fever in someone immunocompromised or on cancer treatment.",
      action: "CALL_CLINIC",
      test: (answers) =>
        hasOption(answers, "chronic_conditions", "Immune suppression") ||
        hasOption(answers, "chronic_conditions", "Cancer treatment"),
    },
    {
      id: "clinic_duration",
      description: "Fever lasting more than three days.",
      action: "CALL_CLINIC",
      test: (answers) => answers["duration"] === "More than 3 days",
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

export default feverAdultTemplate;
