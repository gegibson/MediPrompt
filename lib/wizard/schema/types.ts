export type InputKind = "text" | "select" | "multiselect" | "number" | "scale";

export type Question = {
  id: string;
  label: string;
  kind: InputKind;
  required?: boolean;
  options?: string[];
  help?: string;
  showIf?: { field: string; equals: unknown };
};

export type RedFlagAction = "ER_NOW" | "URGENT_CARE" | "CALL_CLINIC" | "ADVICE_ONLY";

export type Answers = Record<string, unknown>;

export type RedFlagTest = (answers: Answers) => boolean;

export type RedFlag = {
  id: string;
  description: string;
  test: RedFlagTest;
  action: RedFlagAction;
};

export type OutputSection =
  | "title"
  | "summary"
  | "assessment_questions"
  | "red_flags"
  | "guidance"
  | "doctor_prep"
  | "safety_reminder";

export type OutputSpec = {
  sections: OutputSection[];
};

export type TriageTemplate = {
  id: string;
  name: string;
  tags?: string[];
  questions: Question[];
  redFlags: RedFlag[];
  output: OutputSpec;
};

export type TemplateRegistry = Record<string, TriageTemplate>;
