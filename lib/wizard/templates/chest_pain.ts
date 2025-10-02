import { Answers, TriageTemplate } from "../schema/types";

const isSeverePressure = (answers: Answers) => {
  const severityRaw = answers["pain_severity"];
  const severity = typeof severityRaw === "number" ? severityRaw : Number(severityRaw);
  if (!Number.isFinite(severity)) {
    return false;
  }
  if (severity < 8) {
    return false;
  }

  const quality = answers["pain_quality"];
  const qualityStr = typeof quality === "string" ? quality.toLowerCase() : "";
  return qualityStr.includes("pressure") || qualityStr.includes("crushing");
};

const includesSymptom = (answers: Answers, symptom: string) => {
  const value = answers["associated_symptoms"];
  if (Array.isArray(value)) {
    return value.some((item) => String(item).toLowerCase() === symptom.toLowerCase());
  }
  if (typeof value === "string") {
    return value.toLowerCase() === symptom.toLowerCase();
  }
  return false;
};

const hasRedRadiation = (answers: Answers) => {
  const radiation = answers["pain_radiation"];
  if (Array.isArray(radiation)) {
    return radiation.some((item) => {
      const value = String(item).toLowerCase();
      return value.includes("left arm") || value.includes("jaw");
    });
  }
  if (typeof radiation === "string") {
    const value = radiation.toLowerCase();
    return value.includes("left arm") || value.includes("jaw");
  }
  return false;
};

const chestPainTemplate: TriageTemplate = {
  id: "chest_pain_adult",
  name: "Chest Pain (Adult)",
  tags: ["cardiac", "adult"],
  questions: [
    {
      id: "role",
      label: "Who are you completing this triage for?",
      kind: "select",
      required: true,
      options: ["Myself", "Someone else"],
    },
    {
      id: "pain_onset",
      label: "When did the chest discomfort start?",
      kind: "text",
      required: true,
    },
    {
      id: "pain_severity",
      label: "How intense is the discomfort on a scale of 1 (mild) to 10 (worst imaginable)?",
      kind: "scale",
      required: true,
    },
    {
      id: "pain_quality",
      label: "How would you describe the sensation?",
      kind: "select",
      required: true,
      options: ["Sharp", "Pressure/Crushing", "Burning", "Tightness", "Other"],
    },
    {
      id: "pain_radiation",
      label: "Does the discomfort move to other areas?",
      kind: "multiselect",
      options: ["Left arm", "Right arm", "Jaw", "Back", "Neck", "No spreading"],
      required: true,
    },
    {
      id: "associated_symptoms",
      label: "Select any symptoms you are also experiencing.",
      kind: "multiselect",
      options: [
        "Shortness of breath",
        "Sweating",
        "Nausea or vomiting",
        "Lightheadedness or fainting",
        "Palpitations",
        "None of these",
      ],
      required: true,
    },
    {
      id: "cardiac_history",
      label: "Do you have a history of heart problems or recent procedures?",
      kind: "select",
      required: true,
      options: ["No", "Yes - heart disease", "Yes - recent procedure", "Unsure"],
    },
    {
      id: "risk_factors",
      label: "Check any risk factors that apply to you.",
      kind: "multiselect",
      options: [
        "High blood pressure",
        "Diabetes",
        "High cholesterol",
        "Smoking",
        "Family history of early heart disease",
        "None",
      ],
    },
    {
      id: "recent_injury",
      label: "Any recent chest injury or strain?",
      kind: "select",
      options: ["No", "Yes", "Unsure"],
    },
  ],
  redFlags: [
    {
      id: "er_severe_pressure",
      description:
        "Severe pressure-like chest pain spreading to the arm or jaw, especially with shortness of breath or sweating.",
      action: "ER_NOW",
      test: (answers) =>
        isSeverePressure(answers) &&
        (includesSymptom(answers, "Shortness of breath") ||
          includesSymptom(answers, "Sweating") ||
          includesSymptom(answers, "Lightheadedness or fainting")) &&
        hasRedRadiation(answers),
    },
    {
      id: "er_history",
      description: "Chest discomfort with a recent heart procedure or known heart disease.",
      action: "URGENT_CARE",
      test: (answers) => {
        const history = answers["cardiac_history"];
        if (typeof history !== "string") {
          return false;
        }
        return history.includes("heart");
      },
    },
    {
      id: "clinic_risk",
      description: "Chest symptoms with multiple cardiac risk factors present.",
      action: "CALL_CLINIC",
      test: (answers) => {
        const riskFactors = answers["risk_factors"];
        if (!Array.isArray(riskFactors)) {
          return false;
        }
        return riskFactors.filter((item) => String(item) !== "None").length >= 2;
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

export default chestPainTemplate;
