"use client";

import type { LibraryCategory, PromptIndexItem, PromptBody } from "./types";

const CATEGORIES_URL = "/data/categories.json";
const INDEX_URL = "/data/prompts.index.json";
const BODY_URL = (id: string) => `/data/prompts/${encodeURIComponent(id)}.json`;

// Module-level caches (in-memory, client-only)
let categoriesCache: LibraryCategory[] | null = null;
let categoriesLoaded = false;
let indexCache: PromptIndexItem[] | null = null;
let indexLoaded = false;

const BODY_CACHE_MAX = 20;
const bodyCache = new Map<string, PromptBody>();

function touchBodyCache(id: string, value: PromptBody | undefined) {
  if (!value) return;
  // LRU: delete & re-set to move to end
  bodyCache.delete(id);
  bodyCache.set(id, value);
  if (bodyCache.size > BODY_CACHE_MAX) {
    const oldestKey = bodyCache.keys().next().value as string | undefined;
    if (oldestKey) bodyCache.delete(oldestKey);
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<LibraryCategory[] | null> {
  if (categoriesLoaded) {
    return categoriesCache;
  }
  const data = await fetchJson<LibraryCategory[]>(CATEGORIES_URL);
  if (Array.isArray(data)) {
    categoriesCache = data;
    categoriesLoaded = true;
    return categoriesCache;
  }
  categoriesCache = null;
  categoriesLoaded = false;
  return null;
}

export async function getIndex(): Promise<PromptIndexItem[] | null> {
  if (indexLoaded) {
    return indexCache;
  }
  const data = await fetchJson<PromptIndexItem[]>(INDEX_URL);
  if (Array.isArray(data)) {
    indexCache = data;
    indexLoaded = true;
    return indexCache;
  }
  indexCache = null;
  indexLoaded = false;
  return null;
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const index = await getIndex();
  if (!index) {
    return {};
  }
  return index.reduce<Record<string, number>>((acc, item) => {
    acc[item.categoryId] = (acc[item.categoryId] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getByCategory(categoryId: string): Promise<PromptIndexItem[]> {
  const index = await getIndex();
  if (!index) {
    return [];
  }
  return index.filter((i) => i.categoryId === categoryId);
}

export async function getById(id: string): Promise<PromptIndexItem | null> {
  const index = await getIndex();
  if (!index) {
    return null;
  }
  return index.find((i) => i.id === id) ?? null;
}

export async function fetchBodyById(id: string): Promise<PromptBody | null> {
  const cached = bodyCache.get(id);
  if (cached) {
    touchBodyCache(id, cached);
    return cached;
  }
  const data = await fetchJson<PromptBody>(BODY_URL(id));
  if (data && data.id === id && typeof data.body === "string") {
    touchBodyCache(id, data);
    return data;
  }
  return null;
}
