import { Answers, Question, TriageTemplate } from "@/lib/wizard/schema/types";

export const computeVisibleQuestions = (
  template: TriageTemplate,
  answers: Answers,
): Question[] => {
  return template.questions.filter((question) => {
    if (!question.showIf) {
      return true;
    }

    const actualValue = answers[question.showIf.field];
    if (Array.isArray(actualValue)) {
      return actualValue.includes(question.showIf.equals);
    }

    return actualValue === question.showIf.equals;
  });
};

export const pruneHiddenAnswers = (
  template: TriageTemplate | null,
  answers: Answers,
): Answers => {
  if (!template) {
    return answers;
  }

  const visible = new Set(
    computeVisibleQuestions(template, answers).map((question) => question.id),
  );

  const next: Answers = {};
  Object.entries(answers).forEach(([key, value]) => {
    if (visible.has(key)) {
      next[key] = value;
    }
  });

  return next;
};
