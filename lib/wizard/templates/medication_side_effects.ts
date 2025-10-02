import { Answers, TriageTemplate } from "../schema/types";

const asNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

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

const medicationSideEffectsTemplate: TriageTemplate = {
  id: "medication_side_effects",
  name: "Medication Side Effects",
  tags: ["medication", "safety"],
  questions: [
    {
      id: "medication_name",
      label: "Which medication are you taking?",
      kind: "text",
      required: true,
    },
    {
      id: "dosage",
      label: "What dose and schedule are you using?",
      kind: "text",
    },
    {
      id: "last_dose",
      label: "When was your most recent dose?",
      kind: "text",
    },
    {
      id: "symptom_start",
      label: "When did the concerning symptoms start?",
      kind: "text",
      required: true,
    },
    {
      id: "symptom_description",
      label: "Describe what you're experiencing.",
      kind: "text",
      required: true,
    },
    {
      id: "symptom_severity",
      label: "How intense or disruptive are the symptoms (1-10)?",
      kind: "scale",
      required: true,
    },
    {
      id: "symptoms_present",
      label: "Select any symptoms that apply.",
      kind: "multiselect",
      options: [
        "Trouble breathing",
        "Swelling of face or throat",
        "Chest pain",
        "Severe rash or blistering",
        "Dizziness or fainting",
        "Nausea",
        "Diarrhea",
        "Headache",
        "Other",
      ],
    },
    {
      id: "other_conditions",
      label: "Do you have other medical conditions or allergies?",
      kind: "text",
    },
    {
      id: "missed_doses",
      label: "Have you missed any doses recently?",
      kind: "select",
      options: ["No", "Yes - one dose", "Yes - multiple doses", "Unsure"],
    },
  ],
  redFlags: [
    {
      id: "er_breathing",
      description: "Trouble breathing or swelling of face/throat can signal anaphylaxis.",
      action: "ER_NOW",
      test: (answers) =>
        includesOption(answers, "symptoms_present", "Trouble breathing") ||
        includesOption(answers, "symptoms_present", "Swelling of face or throat"),
    },
    {
      id: "er_rash",
      description: "Severe rash or blistering needs immediate evaluation.",
      action: "ER_NOW",
      test: (answers) => includesOption(answers, "symptoms_present", "Severe rash or blistering"),
    },
    {
      id: "urgent_chest_pain",
      description: "New chest pain after a medication dose.",
      action: "URGENT_CARE",
      test: (answers) => includesOption(answers, "symptoms_present", "Chest pain"),
    },
    {
      id: "clinic_dizziness",
      description: "Dizziness or fainting should be reviewed with the prescribing clinician.",
      action: "CALL_CLINIC",
      test: (answers) => includesOption(answers, "symptoms_present", "Dizziness or fainting"),
    },
    {
      id: "clinic_high_severity",
      description: "Symptoms rated 8 or higher interfere with daily activities and need clinician guidance.",
      action: "CALL_CLINIC",
      test: (answers) => {
        const severity = asNumber(answers["symptom_severity"]);
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

export default medicationSideEffectsTemplate;
