import { Answers, TriageTemplate } from "../schema/types";

const toNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getAgeInMonths = (answers: Answers) => {
  const ageValue = toNumber(answers["child_age_months"]);
  return typeof ageValue === "number" ? ageValue : undefined;
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

const feverPediatricTemplate: TriageTemplate = {
  id: "fever_pediatric",
  name: "Fever (Pediatric)",
  tags: ["infection", "pediatric"],
  questions: [
    {
      id: "child_age_months",
      label: "How old is the child (in months)?",
      kind: "number",
      required: true,
    },
    {
      id: "temperature_peak",
      label: "Highest temperature measured?",
      kind: "number",
      required: true,
    },
    {
      id: "temperature_unit",
      label: "Measurement unit",
      kind: "select",
      required: true,
      options: ["Fahrenheit", "Celsius"],
    },
    {
      id: "duration",
      label: "How long has the fever been present?",
      kind: "select",
      required: true,
      options: ["Less than 24 hours", "1-3 days", "More than 3 days"],
    },
    {
      id: "behavior",
      label: "How is the child behaving?",
      kind: "select",
      required: true,
      options: ["Alert and playful", "Sleepier than usual", "Difficult to wake", "Irritable or inconsolable"],
    },
    {
      id: "intake_output",
      label: "Feeding and diaper output",
      kind: "select",
      options: [
        "Normal feeding and wet diapers",
        "Drinking less, fewer wet diapers",
        "Not drinking, almost no wet diapers",
      ],
      required: true,
    },
    {
      id: "symptoms",
      label: "Any concerning symptoms?",
      kind: "multiselect",
      options: [
        "Stiff neck",
        "Purple rash",
        "Trouble breathing",
        "Seizure",
        "Persistent vomiting",
        "Ear pain",
        "Cough",
        "None",
      ],
    },
    {
      id: "immunizations",
      label: "Is the child up to date on immunizations?",
      kind: "select",
      options: ["Yes", "No", "Unsure"],
    },
    {
      id: "premature",
      label: "Was the child born prematurely (<37 weeks)?",
      kind: "select",
      options: ["No", "Yes", "Unsure"],
    },
  ],
  redFlags: [
    {
      id: "er_age_temp",
      description: "Fever in infants younger than 3 months requires immediate medical evaluation.",
      action: "ER_NOW",
      test: (answers) => {
        const ageMonths = getAgeInMonths(answers);
        const temp = toNumber(answers["temperature_peak"]);
        return typeof ageMonths === "number" && ageMonths < 3 && typeof temp === "number" && temp >= 100.4;
      },
    },
    {
      id: "er_behavior",
      description: "Child very difficult to wake or has seizures.",
      action: "ER_NOW",
      test: (answers) => {
        const behavior = answers["behavior"];
        if (behavior === "Difficult to wake") {
          return true;
        }
        return hasOption(answers, "symptoms", "Seizure");
      },
    },
    {
      id: "urgent_dehydration",
      description: "Poor intake with almost no wet diapers suggests dehydration.",
      action: "URGENT_CARE",
      test: (answers) => answers["intake_output"] === "Not drinking, almost no wet diapers",
    },
    {
      id: "urgent_rash",
      description: "Fever with purple rash or stiff neck.",
      action: "URGENT_CARE",
      test: (answers) =>
        hasOption(answers, "symptoms", "Purple rash") || hasOption(answers, "symptoms", "Stiff neck"),
    },
    {
      id: "clinic_duration",
      description: "Fever lasting longer than three days.",
      action: "CALL_CLINIC",
      test: (answers) => answers["duration"] === "More than 3 days",
    },
    {
      id: "clinic_premature",
      description: "Fever in a child born prematurely needs clinician guidance.",
      action: "CALL_CLINIC",
      test: (answers) => answers["premature"] === "Yes",
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

export default feverPediatricTemplate;
