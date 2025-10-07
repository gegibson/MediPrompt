import { cache } from "react";
import path from "path";
import { promises as fs } from "fs";

import type { LibraryCategory, PromptBody, PromptIndexItem } from "./types";

const PUBLIC_DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(PUBLIC_DATA_DIR, relativePath);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export const getServerCategories = cache(async (): Promise<LibraryCategory[]> => {
  try {
    return await readJson<LibraryCategory[]>("categories.json");
  } catch {
    return [];
  }
});

const DEFAULT_USAGE_TIPS = [
  "Keep names, dates, and policy numbers out of the prompt.",
  "Verify AI-generated advice with your clinician before acting.",
  "Use the prompt as a guide, not a diagnosis.",
];

function applyPromptDefaults<T extends PromptIndexItem>(prompt: T): T {
  return {
    isFree: true,
    relatedPrompts: [],
    ...prompt,
  };
}

export const getServerPromptIndex = cache(async (): Promise<PromptIndexItem[]> => {
  try {
    const index = await readJson<PromptIndexItem[]>("prompts.index.json");
    return index.map(applyPromptDefaults);
  } catch {
    return [];
  }
});

export const getServerPromptBody = cache(async (id: string): Promise<PromptBody | null> => {
  try {
    const prompt = await readJson<PromptBody>(path.join("prompts", `${id}.json`));
    const withDefaults = applyPromptDefaults(prompt);
    return {
      ...withDefaults,
      usageTips: prompt.usageTips && prompt.usageTips.length > 0 ? prompt.usageTips : DEFAULT_USAGE_TIPS,
    };
  } catch {
    return null;
  }
});

export const getServerCategoryCounts = cache(async (): Promise<Record<string, number>> => {
  const index = await getServerPromptIndex();
  return index.reduce<Record<string, number>>((acc, item) => {
    acc[item.categoryId] = (acc[item.categoryId] ?? 0) + 1;
    return acc;
  }, {});
});
