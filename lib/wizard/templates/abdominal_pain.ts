import { Answers, TriageTemplate } from "../schema/types";

const toNumber = (value: unknown) => {
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

const abdominalPainTemplate: TriageTemplate = {
  id: "abdominal_pain",
  name: "Abdominal Pain",
  tags: ["gastrointestinal", "adult"],
  questions: [
    {
      id: "pain_location",
      label: "Where is the pain located?",
      kind: "select",
      required: true,
      options: [
        "Upper right",
        "Upper middle",
        "Upper left",
        "Lower right",
        "Lower left",
        "Diffuse / all over",
        "Pelvic",
      ],
    },
    {
      id: "pain_severity",
      label: "How strong is the pain (1-10)?",
      kind: "scale",
      required: true,
    },
    {
      id: "pain_duration",
      label: "When did it start?",
      kind: "select",
      required: true,
      options: ["Within the last 6 hours", "6-24 hours", "1-3 days", "More than 3 days"],
    },
    {
      id: "pain_character",
      label: "How would you describe the pain?",
      kind: "multiselect",
      required: true,
      options: ["Sharp", "Cramping", "Burning", "Pressure", "Comes in waves", "Other"],
    },
    {
      id: "associated_symptoms",
      label: "Any of these symptoms?",
      kind: "multiselect",
      options: [
        "Fever",
        "Vomiting",
        "Blood in vomit",
        "Blood in stool",
        "Inability to pass gas",
        "Abdominal swelling",
        "Fainting",
        "None",
      ],
    },
    {
      id: "bowel_habits",
      label: "Last bowel movement?",
      kind: "select",
      options: ["Today", "Yesterday", "2-3 days ago", "4+ days ago"],
    },
    {
      id: "pregnancy",
      label: "Could you be pregnant?",
      kind: "select",
      options: ["No", "Yes", "Unsure", "Not applicable"],
    },
    {
      id: "surgical_history",
      label: "Any abdominal surgeries in the past?",
      kind: "select",
      options: ["No", "Appendix removed", "Gallbladder removed", "Bariatric surgery", "Other"],
    },
  ],
  redFlags: [
    {
      id: "er_blood",
      description: "Blood in vomit or stool with abdominal pain.",
      action: "ER_NOW",
      test: (answers) =>
        includesOption(answers, "associated_symptoms", "Blood in vomit") ||
        includesOption(answers, "associated_symptoms", "Blood in stool"),
    },
    {
      id: "er_severe",
      description: "Severe abdominal pain intensity 9-10 or fainting.",
      action: "ER_NOW",
      test: (answers) => {
        const severity = toNumber(answers["pain_severity"]);
        return (
          (typeof severity === "number" && severity >= 9) || includesOption(answers, "associated_symptoms", "Fainting")
        );
      },
    },
    {
      id: "urgent_swelling",
      description: "Abdominal swelling or inability to pass gas could signal obstruction.",
      action: "URGENT_CARE",
      test: (answers) =>
        includesOption(answers, "associated_symptoms", "Abdominal swelling") ||
        includesOption(answers, "associated_symptoms", "Inability to pass gas"),
    },
    {
      id: "clinic_duration",
      description: "Pain lasting more than three days should be reviewed by a clinician.",
      action: "CALL_CLINIC",
      test: (answers) => answers["pain_duration"] === "More than 3 days",
    },
    {
      id: "clinic_pregnancy",
      description: "Abdominal or pelvic pain during pregnancy needs clinician guidance.",
      action: "CALL_CLINIC",
      test: (answers) => answers["pregnancy"] === "Yes",
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

export default abdominalPainTemplate;
