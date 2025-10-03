import type { PromptBody, PromptIndexItem } from "./types";

import primaryCareIntake from "@/data/prompts/primary-care-intake-checklist.json";

export const promptBodies: PromptBody[] = [primaryCareIntake as PromptBody];

export const promptIndex: PromptIndexItem[] = promptBodies.map((prompt) => {
  const { body, ...meta } = prompt;
  void body;
  return meta;
});

export function getPromptById(id: string): PromptBody | undefined {
  return promptBodies.find((prompt) => prompt.id === id);
}

export function getRelatedPrompts(
  id: string,
  categoryId: string,
  limit = 3,
): PromptIndexItem[] {
  return promptBodies
    .filter((prompt) => prompt.id !== id && prompt.categoryId === categoryId)
    .slice(0, limit)
    .map((prompt) => {
      const { body, ...meta } = prompt;
      void body;
      return meta;
    });
}
