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

export const getServerPromptIndex = cache(async (): Promise<PromptIndexItem[]> => {
  try {
    return await readJson<PromptIndexItem[]>("prompts.index.json");
  } catch {
    return [];
  }
});

export const getServerPromptBody = cache(async (id: string): Promise<PromptBody | null> => {
  try {
    return await readJson<PromptBody>(path.join("prompts", `${id}.json`));
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
