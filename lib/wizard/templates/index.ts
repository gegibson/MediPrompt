import abdominalPain from "./abdominal_pain";
import chestPain from "./chest_pain";
import feverAdult from "./fever_adult";
import feverPediatric from "./fever_peds";
import headache from "./headache";
import medicationSideEffects from "./medication_side_effects";
import shortnessOfBreath from "./shortness_of_breath";
import { TemplateRegistry } from "../schema/types";

export const wizardTemplates: TemplateRegistry = {
  [abdominalPain.id]: abdominalPain,
  [chestPain.id]: chestPain,
  [feverAdult.id]: feverAdult,
  [feverPediatric.id]: feverPediatric,
  [headache.id]: headache,
  [medicationSideEffects.id]: medicationSideEffects,
  [shortnessOfBreath.id]: shortnessOfBreath,
};

export const wizardTemplateList = Object.values(wizardTemplates);

export type WizardTemplateId = keyof typeof wizardTemplates;
