export type PromptCategory = {
  id: string;
  name: string;
  icon: string;
  description?: string;
};

export type PromptLibraryEntry = {
  id: string;
  category: PromptCategory["id"];
  title: string;
  description: string;
  promptText: string;
  tags?: readonly string[];
};

export const promptCategories: readonly PromptCategory[] = [
  {
    id: "talking-doctor",
    name: "Talking to Your Doctor",
    icon: "🩺",
    description: "Guides for respectful, productive conversations during clinical visits.",
  },
  {
    id: "understanding-medications",
    name: "Understanding Medications",
    icon: "💊",
    description: "Support for safely discussing how medicines fit into daily life.",
  },
  {
    id: "insurance-billing",
    name: "Insurance & Billing",
    icon: "📄",
    description: "Plain-language tools for navigating statements and coverage steps.",
  },
  {
    id: "lab-results",
    name: "Lab Results & Reports",
    icon: "🧪",
    description: "Helps translate test findings into clear follow-up conversations.",
  },
  {
    id: "second-opinions",
    name: "Second Opinions",
    icon: "🧭",
    description: "Encourages thoughtful, collaborative review of complex care decisions.",
  },
  {
    id: "caregiver-support",
    name: "Caregiver Support",
    icon: "🤝",
    description: "Resources for advocates supporting loved ones while protecting privacy.",
  },
];

export const promptLibraryEntries: readonly PromptLibraryEntry[] = [
  {
    id: "talking-doctor-new-medication",
    category: "talking-doctor",
    title: "How to Ask About a New Medication",
    description: "Prepare privacy-conscious questions before starting a prescribed medicine.",
    promptText:
      "You are an educational health communication coach. Help me prepare for a conversation about starting a new medication. I will describe the medicine using generic terms only (for example, 'a new blood pressure medicine') and will avoid names, dates, addresses, or any personal identifiers. " +
      "Create a structured outline that includes: 1) a brief way to explain why the prescribing clinician recommended the medication, 2) at least five clarifying questions to ask about how and when to take it, 3) prompts to discuss potential side effects, interactions, and what to do if a dose is missed, 4) a reminder to confirm how the medication fits with current lifestyle habits, and 5) tips for summarizing the plan back to the clinician to confirm understanding. " +
      "Add a gentle reminder to bring a written list of other medicines or supplements, using generic descriptions only. Keep the tone supportive, practical, and educational. Close with a short checklist of next steps I can review after the appointment to ensure I followed the guidance safely.",
    tags: ["medication", "doctor-visit", "questions"],
  },
  {
    id: "talking-doctor-new-diagnosis",
    category: "talking-doctor",
    title: "Understanding a New Diagnosis",
    description: "Clarify a recent diagnosis with compassionate, plain-language questions.",
    promptText:
      "You are an educational explainer helping me review a new diagnosis from my healthcare professional. I will describe the condition in generic terms only (for example, 'an inflammatory joint condition') and will never include names, dates of birth, medical record numbers, or other identifiers. " +
      "Please produce a structured prompt I can read to an AI assistant that guides it to: 1) restate the diagnosis in plain language, 2) outline key questions to ask about what the condition means for daily life, 3) suggest clarifying questions about recommended tests, monitoring, or lifestyle changes, 4) highlight warning signs that should prompt urgent follow-up (described generically), 5) recommend ways to track symptoms or concerns between visits, and 6) list trusted, evidence-informed resources to discuss with the clinician. " +
      "Keep the tone calm, compassionate, and educational. Include reminders to confirm information with my own care team and to summarize what I heard back to the clinician to check understanding. Close with a short checklist I can bring to the appointment, leaving space for notes.",
    tags: ["diagnosis", "doctor-visit", "education"],
  },
  {
    id: "talking-doctor-appointment-prep",
    category: "talking-doctor",
    title: "Preparing for Your Doctor's Appointment",
    description: "Organize goals, questions, and follow-up plans for an upcoming visit.",
    promptText:
      "You are an educational planning assistant helping me organize a doctor's appointment. I will only provide generic descriptions such as 'ongoing knee discomfort' or 'family history of heart issues' and will not share names, dates of birth, addresses, or other personal identifiers. " +
      "Create a prompt I can use with an AI tool that results in: 1) a concise visit agenda with top concerns and goals, 2) suggested language for summarizing symptom patterns (timing, triggers, self-care tried) while keeping details generic, 3) questions to clarify diagnosis, tests, treatment options, and follow-up timelines, 4) reminders to review current medications, supplements, or devices using generic names, 5) space for noting lifestyle factors or accessibility needs, and 6) closing steps for confirming next actions before leaving the visit. " +
      "Include a brief checklist for bringing insurance cards, medication lists, and any monitoring logs while keeping identifying information private. Emphasize respectful communication, shared decision-making, and confirmation that the visit is educational, not a substitute for individualized medical advice. End with a calm reminder to seek urgent care if severe or worsening symptoms arise.",
    tags: ["appointment", "planning", "communication"],
  },
  {
    id: "understanding-medications-side-effects",
    category: "understanding-medications",
    title: "Understanding Medication Side Effects",
    description: "Get ready to discuss possible side effects and how to respond safely.",
    promptText:
      "You are an educational medication coach helping a patient discuss potential side effects of a prescribed medicine. I will only reference the medicine with a generic descriptor such as 'a daily cholesterol pill' and will avoid any names, dates, ID numbers, or other personal details. " +
      "Build a prompt I can give to an AI assistant that guides it to: 1) explain how to describe the medication purpose in plain language, 2) provide at least five open-ended questions to ask about possible side effects, their likelihood, and how to manage them, 3) outline what to watch for at home using non-identifying descriptions, 4) clarify when to call the prescribing clinician, contact a pharmacist, or seek emergency attention, 5) remind me to discuss interactions with existing medicines, supplements, or foods (named generically), 6) suggest ways to document side effects in a simple tracking log, and 7) reinforce that any urgent concerns require direct medical care. " +
      "Keep the tone calm, empathetic, and educational. Include a brief reminder to double-check guidance with my care team and to avoid sharing protected health information when asking for help online.",
    tags: ["medication", "safety", "side-effects"],
  },
  {
    id: "understanding-medications-interactions",
    category: "understanding-medications",
    title: "Checking for Medication Interactions",
    description: "Plan a pharmacist conversation about combining medicines safely.",
    promptText:
      "You are an educational pharmacy companion helping me prepare to discuss possible interactions between medicines. I will only reference products using generic descriptions such as 'a weekly injectable diabetes medicine' or 'an over-the-counter sleep aid' and will not share names, dates of birth, or other identifiers. " +
      "Draft a prompt for an AI assistant that encourages it to: 1) gather a neatly organized list of current prescriptions, over-the-counter items, vitamins, and herbal supplements (all described generically), 2) outline questions to ask a pharmacist or clinician about interactions, timing, storage, and duplicate ingredients, 3) highlight signs of interactions to monitor without diagnosing conditions, 4) recommend steps for keeping an updated medication list, 5) remind me to include information about alcohol, caffeine, and diet patterns that could affect medicine safety, 6) provide guidance on what to do if concerning symptoms appear, and 7) emphasize that final decisions must come from licensed professionals. " +
      "Keep the tone supportive and privacy-conscious, and close with a concise checklist I can bring to appointments while omitting any personal identifiers.",
    tags: ["medication", "pharmacy", "safety"],
  },
  {
    id: "insurance-billing-medical-bill",
    category: "insurance-billing",
    title: "Understanding Your Medical Bill",
    description: "Break down a medical invoice and plan confident follow-up calls.",
    promptText:
      "You are an educational healthcare billing coach helping me review a medical bill. I will only reference the visit in generic terms such as 'an outpatient imaging visit' and will not include names, account numbers, claim IDs, or other personal identifiers. " +
      "Construct a prompt for an AI assistant that guides it to: 1) explain how to break down the bill into facility fees, professional fees, insurance adjustments, and patient responsibility, 2) suggest neutral language for clarifying unfamiliar codes or abbreviations, 3) list questions to ask the insurer about coverage, deductibles, and appeals without sharing personal details, 4) outline steps for comparing the bill against an explanation of benefits, 5) identify red flags that may warrant a corrected claim, 6) provide a script for requesting a payment plan or financial assistance, and 7) remind me to take notes on who I spoke with and when, using generic references only. " +
      "Keep the tone calm, respectful, and empowerment-focused. Close with a short checklist for next actions and a reminder to safeguard sensitive documents and confirm all information directly with the billing office.",
    tags: ["billing", "insurance", "financial"],
  },
  {
    id: "insurance-billing-prior-authorization",
    category: "insurance-billing",
    title: "Navigating Prior Authorization",
    description: "Prepare documents and questions before starting an authorization request.",
    promptText:
      "You are an educational insurance navigator helping me prepare for a prior authorization request. I will describe the treatment or service using generic terms like 'an outpatient physical therapy plan' and will not share names, policy numbers, or other personal identifiers. " +
      "Draft a prompt I can share with an AI assistant that results in: 1) a checklist of documents typically requested (referral notes, medical necessity letters, plan benefit summaries) described generically, 2) questions to ask the insurance representative about timelines, required forms, and appeal options, 3) tips for coordinating communication between the clinician, insurer, and pharmacy or facility, 4) guidance on documenting every call, including date, time, and general topic without personal details, 5) suggestions for what to do if authorization is delayed or denied, and 6) reminders to stay polite, persistent, and privacy-conscious. " +
      "Keep the tone supportive and focused on education. Include a brief closing paragraph emphasizing that final decisions depend on the specific insurance contract and that no protected health information should be shared when using public tools.",
    tags: ["insurance", "authorization", "planning"],
  },
  {
    id: "lab-results-understanding",
    category: "lab-results",
    title: "Understanding Your Lab Results",
    description: "Translate lab findings into follow-up questions and next steps.",
    promptText:
      "You are an educational lab-results explainer helping me prepare for a conversation about recent test findings. I will describe the test in generic terms such as 'a routine blood panel' or 'an imaging report' and will not include names, dates of birth, specimen IDs, or other personal identifiers. " +
      "Create a prompt for an AI assistant that encourages it to: 1) restate the purpose of the test in plain language, 2) outline questions to ask about what the numbers or impressions mean, 3) suggest ways to discuss normal ranges, trends over time, and factors that might affect accuracy, 4) identify which results could require urgent follow-up (described generally, not diagnostically), 5) recommend how to track symptoms or changes to share during the next visit, 6) compile educational resources approved by reputable organizations to review with my clinician, and 7) remind me to verify all interpretations with the ordering healthcare professional. " +
      "Maintain an empathetic, factual tone and close with a short checklist for documenting action steps while keeping all personal health information private.",
    tags: ["lab-results", "questions", "education"],
  },
  {
    id: "second-opinions-prep",
    category: "second-opinions",
    title: "Preparing for a Second Opinion",
    description: "Coordinate respectful conversations when seeking another perspective.",
    promptText:
      "You are an educational health advocate guiding me as I seek a second opinion. I will discuss the situation using generic descriptions such as 'a complex joint surgery recommendation' and will not provide names, medical record numbers, or other identifiers. " +
      "Draft a prompt for an AI assistant that results in: 1) a polite summary of the current diagnosis and proposed treatment using plain language, 2) a list of records or imaging to request, described generally, 3) questions to confirm how the second clinician's viewpoint may align or differ, 4) prompts for discussing benefits, risks, alternatives, and watchful waiting, 5) strategies for organizing notes during appointments, 6) reminders about insurance or referral requirements without citing specific policy numbers, and 7) encouragement to communicate openly with the original care team. " +
      "Keep the tone respectful, collaborative, and privacy-conscious. Conclude with a short checklist that reinforces bringing only necessary documentation, protecting personal health information, and confirming all medical decisions with licensed professionals.",
    tags: ["second-opinion", "planning", "communication"],
  },
  {
    id: "caregiver-support-loved-one",
    category: "caregiver-support",
    title: "Questions for Your Loved One's Doctor",
    description: "Support a loved one during appointments while honoring privacy.",
    promptText:
      "You are an educational caregiver guide helping me support a loved one during a medical visit. I will talk about the loved one using generic descriptions such as 'an older adult with mobility concerns' and will not share names, addresses, dates, or other identifiers. " +
      "Build a prompt I can give to an AI assistant that produces: 1) respectful language for introducing myself as a caregiver and confirming consent, 2) a prioritized list of questions about the care plan, medication changes, and follow-up, 3) guidance on documenting symptoms or behavior changes between visits, 4) reminders to ask about warning signs that require urgent attention, 5) tips for coordinating home routines, transportation, or community resources, 6) notes on supporting the loved one's autonomy and privacy while staying involved, and 7) suggestions for debriefing with the loved one after the appointment. " +
      "Maintain a compassionate, empowering tone. Close with a brief checklist covering preparation steps, space for action items, and a reminder to avoid sharing protected health information when using digital tools.",
    tags: ["caregiver", "support", "communication"],
  },
];

export const promptLibrary = {
  categories: promptCategories,
  prompts: promptLibraryEntries,
} as const;
