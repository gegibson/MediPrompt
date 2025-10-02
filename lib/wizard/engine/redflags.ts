import { Answers, RedFlag, TriageTemplate } from "../schema/types";

export type RedFlagEvaluation = {
  flags: RedFlag[];
  emergency: RedFlag[];
  nonEmergency: RedFlag[];
};

export const evaluateRedFlags = (
  template: TriageTemplate,
  answers: Answers,
): RedFlagEvaluation => {
  const triggered = template.redFlags.filter((flag) => {
    try {
      return Boolean(flag.test(answers));
    } catch (error) {
      console.warn("[Wizard] red flag test failed", flag.id, error);
      return false;
    }
  });

  const emergency = triggered.filter((flag) => flag.action === "ER_NOW");
  const nonEmergency = triggered.filter((flag) => flag.action !== "ER_NOW");

  return {
    flags: triggered,
    emergency,
    nonEmergency,
  };
};
