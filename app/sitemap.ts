import type { MetadataRoute } from "next";

import { buildCanonicalPath } from "@/lib/config/site";
import { getServerCategories, getServerPromptIndex } from "@/lib/library/serverData";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [promptIndex, categories] = await Promise.all([
    getServerPromptIndex(),
    getServerCategories(),
  ]);
  const now = new Date().toISOString();

  const staticRoutes = ["/", "/library", "/library/categories", "/disclaimer", "/privacy", "/terms"];

  const categoryRoutes = categories.map((category) => ({
    url: buildCanonicalPath(`/library?category=${encodeURIComponent(category.id)}`),
    lastModified: now,
  }));

  const promptRoutes = promptIndex.map((prompt) => ({
    url: buildCanonicalPath(`/library/${prompt.id}`),
    lastModified: prompt.updatedAt ?? prompt.createdAt ?? now,
  }));

  const staticEntries = staticRoutes.map((path) => ({
    url: buildCanonicalPath(path),
    lastModified: now,
  }));

  return [...staticEntries, ...categoryRoutes, ...promptRoutes];
}
