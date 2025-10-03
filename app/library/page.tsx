"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  FilterPanel,
  cloneFilterState,
  createDefaultState,
  type FilterGroupKey,
  type FilterState,
} from "@/components/library/FilterPanel";
import { LibraryHero } from "@/components/library/LibraryHero";
import { MobileFilterSheet } from "@/components/library/MobileFilterSheet";
import { getCategories, getIndex } from "@/lib/library/dataClient";
import type { PromptIndexItem } from "@/lib/library/types";

type CardItem = PromptIndexItem & { categoryName: string; categoryIcon?: string };

type Resource = {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  categoryIcon?: string;
};

export default function HealthcareLibraryPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(() => createDefaultState());
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [items, setItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [index, cats] = await Promise.all([getIndex(), getCategories()]);
      if (!mounted) return;
      const catMap = new Map(cats.map((c) => [c.id, c]));
      const mapped: CardItem[] = index.map((i) => {
        const cat = catMap.get(i.categoryId);
        return {
          ...i,
          categoryName: cat?.name ?? i.categoryId,
          categoryIcon: cat?.icon,
        };
      });
      setItems(mapped);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSortChange = (sort: string) => {
    setFilters((prev) => ({ ...prev, sort }));
  };

  const handleToggle = (group: FilterGroupKey, value: string) => {
    setFilters((prev) => {
      const next = cloneFilterState(prev);
      if (next[group].has(value)) {
        next[group].delete(value);
      } else {
        next[group].add(value);
      }
      return next;
    });
  };

  const handleReset = () => {
    setFilters(createDefaultState());
  };

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matchesQuery = (resource: Resource) => {
      if (!normalizedQuery) {
        return true;
      }

      return [resource.title, resource.description, resource.category]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    };

    let results: Resource[] = items
      .map((it) => ({
        id: it.id,
        title: it.title,
        description: it.shortDescription,
        category: it.categoryName,
        categoryId: it.categoryId,
        categoryIcon: it.categoryIcon,
      }))
      .filter((r) => matchesQuery(r));

    if (filters.categories.size) {
      results = results.filter((r) => filters.categories.has(r.categoryId));
    }

    if (filters.sort === "title-asc") {
      results = [...results].sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sort === "title-desc") {
      results = [...results].sort((a, b) => b.title.localeCompare(a.title));
    }

    return results;
  }, [filters, items, query]);

  return (
    <div className="bg-[var(--color-surface-subtle)] pb-16 pt-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 lg:flex-row lg:px-6">
        <FilterPanel
          state={filters}
          onSortChange={handleSortChange}
          onToggle={handleToggle}
          onReset={handleReset}
        />

        <section className="flex-1">
          <LibraryHero
            query={query}
            onQueryChange={setQuery}
            onOpenFilters={() => setIsMobileFiltersOpen(true)}
          />

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <p className="text-sm text-[var(--color-muted)]">Loading prompts…</p>
            ) : filteredResources.length ? (
              filteredResources.map((resource) => (
                <article
                  key={resource.id}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md"
                >
                  <span className="inline-flex items-center gap-2 self-start rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    {resource.categoryIcon}
                    {resource.category}
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                    <Link href={`/library/${resource.id}`}>{resource.title}</Link>
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-[var(--color-muted)]">
                    {resource.description}
                  </p>
                  <div className="mt-4 flex items-center justify-end text-xs font-medium">
                    <Link
                      href={`/library/${resource.id}`}
                      className="inline-flex items-center gap-1 text-[var(--color-primary)] transition hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      View
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M7.5 5H15v7.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 15 15 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No prompts match your filters.</p>
            )}
          </div>
        </section>
      </div>

      <MobileFilterSheet
        open={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        state={filters}
        onSortChange={handleSortChange}
        onToggle={handleToggle}
        onReset={handleReset}
      />
    </div>
  );
}
