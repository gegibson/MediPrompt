"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  FilterPanel,
  cloneFilterState,
  createDefaultState,
  sortOptions,
  situationOptions,
  audienceTagOptions,
  type FacetOption,
  type FilterGroupKey,
  type FilterState,
} from "@/components/library/FilterPanel";
import { LibraryHero } from "@/components/library/LibraryHero";
import { MobileFilterSheet } from "@/components/library/MobileFilterSheet";
import { getCategories, getIndex } from "@/lib/library/dataClient";
import type { PromptIndexItem } from "@/lib/library/types";
import { trackLibraryFilters, trackLibraryZeroResult } from "@/lib/analytics/events";

type CardItem = PromptIndexItem & {
  categoryName: string;
  categoryIcon?: string;
};

type Resource = {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  patientTags: string[];
  situationTags: string[];
  audienceTags: string[];
  createdAt?: string;
  popularity?: number;
};

const PAGE_SIZE = 12;
const POPULAR_QUERIES = ["intake", "pediatrics", "follow-up"];

export default function HealthcareLibraryPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(() => createDefaultState());
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [items, setItems] = useState<CardItem[]>([]);
  const [categories, setCategories] = useState<FacetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastFilterEvent = useRef<string>("");
  const lastZeroResultKey = useRef<string>("");
  const isMountedRef = useRef(true);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadLibrary = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [indexData, categoryData] = await Promise.all([getIndex(), getCategories()]);
      if (!isMountedRef.current) {
        return;
      }
      if (!indexData || !categoryData) {
        setLoadError("We couldn't load the prompt library. Please try again.");
        return;
      }
      const catMap = new Map(categoryData.map((category) => [category.id, category] as const));
      setCategories(
        categoryData.map((cat) => ({
          id: cat.id,
          label: cat.name,
        })),
      );
      const mapped: CardItem[] = indexData.map((item) => {
        const cat = catMap.get(item.categoryId);
        return {
          ...item,
          categoryName: cat?.name ?? item.categoryId,
          categoryIcon: cat?.icon,
        };
      });
      setItems(mapped);
    } catch {
      if (!isMountedRef.current) {
        return;
      }
      setLoadError("We couldn't load the prompt library. Please try again.");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (initialized) {
      return;
    }
    const initialFilters = createDefaultState();
    const qParam = searchParams.get("q") ?? "";
    const sortParam = searchParams.get("sort");
    if (sortParam && sortOptions.some((option) => option.id === sortParam)) {
      initialFilters.sort = sortParam;
    }
    searchParams.getAll("category").forEach((id) => {
      if (id) {
        initialFilters.categories.add(id);
      }
    });
    searchParams.getAll("situation").forEach((id) => {
      if (id) {
        initialFilters.situations.add(id);
      }
    });
    searchParams.getAll("audience").forEach((id) => {
      if (id) {
        initialFilters.audiences.add(id);
      }
    });
    const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
    if (!Number.isNaN(pageParam) && pageParam > 0) {
      setCurrentPage(pageParam);
    }
    setQuery(qParam);
    setFilters(initialFilters);
    setInitialized(true);
  }, [searchParams, initialized]);

  const handleSortChange = (sort: string) => {
    setFilters((prev) => ({ ...prev, sort }));
    setCurrentPage(1);
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
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters(createDefaultState());
    setQuery("");
    setCurrentPage(1);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const handleSuggestionSelect = (value: string) => {
    setFilters(createDefaultState());
    handleQueryChange(value);
  };

  useEffect(() => {
    if (!initialized) {
      return;
    }
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }
    if (filters.sort && filters.sort !== sortOptions[0].id) {
      params.set("sort", filters.sort);
    }
    if (filters.categories.size) {
      Array.from(filters.categories)
        .sort()
        .forEach((id) => params.append("category", id));
    }
    if (filters.situations.size) {
      Array.from(filters.situations)
        .sort()
        .forEach((id) => params.append("situation", id));
    }
    if (filters.audiences.size) {
      Array.from(filters.audiences)
        .sort()
        .forEach((id) => params.append("audience", id));
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }

    const nextSearch = params.toString();
    if (nextSearch === searchParams.toString()) {
      return;
    }

    startTransition(() => {
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
    });
  }, [currentPage, filters, query, initialized, pathname, router, searchParams, startTransition]);

  const resources = useMemo<Resource[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.shortDescription,
        category: item.categoryName,
        categoryId: item.categoryId,
        patientTags: item.patientFacingTags ?? [],
        situationTags: item.situationTags ?? [],
        audienceTags: item.audienceTags ?? [],
        createdAt: item.createdAt,
        popularity: item.popularity,
      })),
    [items],
  );

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let results = resources.filter((resource) => {
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        resource.title,
        resource.description,
        resource.category,
        ...resource.patientTags,
        ...resource.situationTags,
        ...resource.audienceTags,
      ]
        .join(" ")
        .toLowerCase();
      return normalizedQuery.split(/\s+/).every((part) => haystack.includes(part));
    });

    if (filters.categories.size) {
      results = results.filter((resource) => filters.categories.has(resource.categoryId));
    }

    if (filters.situations.size) {
      results = results.filter((resource) =>
        resource.situationTags.some((tag) => filters.situations.has(tag)),
      );
    }

    if (filters.audiences.size) {
      results = results.filter((resource) =>
        resource.audienceTags.some((tag) => filters.audiences.has(tag)),
      );
    }

    const scored = results.map((resource) => ({
      resource,
      score: scoreResource(resource, query, filters),
    }));

    const sorted = scored.sort((a, b) => {
      if (filters.sort === "title-asc") {
        return a.resource.title.localeCompare(b.resource.title);
      }
      if (filters.sort === "title-desc") {
        return b.resource.title.localeCompare(a.resource.title);
      }
      if (filters.sort === "recent") {
        return (Date.parse(b.resource.createdAt ?? "") || 0) - (Date.parse(a.resource.createdAt ?? "") || 0);
      }
      if (filters.sort === "popular") {
        const popA = a.resource.popularity ?? 0;
        const popB = b.resource.popularity ?? 0;
        if (popB !== popA) {
          return popB - popA;
        }
        return (Date.parse(b.resource.createdAt ?? "") || 0) - (Date.parse(a.resource.createdAt ?? "") || 0);
      }
      return b.score - a.score;
    });

    return sorted.map((entry) => entry.resource);
  }, [filters, resources, query]);

  const totalResults = filteredResources.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  useEffect(() => {
    if (!initialized) {
      return;
    }
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, initialized, totalPages]);

  const paginatedResources = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredResources.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredResources]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + paginatedResources.length, totalResults);
  const showingStart = totalResults ? startIndex + 1 : 0;
  const showingEnd = totalResults ? endIndex : 0;

  const hasActiveFilters = useMemo(() => {
    if (query.trim()) {
      return true;
    }
    if (filters.sort && filters.sort !== sortOptions[0].id) {
      return true;
    }
    if (filters.categories.size || filters.situations.size || filters.audiences.size) {
      return true;
    }
    return false;
  }, [filters, query]);

  const handleRetry = () => {
    if (!loading) {
      loadLibrary();
    }
  };

  const categoryCounts = useMemo(() => {
    return resources.reduce<Record<string, number>>((acc, resource) => {
      acc[resource.categoryId] = (acc[resource.categoryId] ?? 0) + 1;
      return acc;
    }, {});
  }, [resources]);

  const situationCounts = useMemo(() => {
    return resources.reduce<Record<string, number>>((acc, resource) => {
      resource.situationTags.forEach((tag) => {
        acc[tag] = (acc[tag] ?? 0) + 1;
      });
      return acc;
    }, {});
  }, [resources]);

  const audienceCounts = useMemo(() => {
    return resources.reduce<Record<string, number>>((acc, resource) => {
      resource.audienceTags.forEach((tag) => {
        acc[tag] = (acc[tag] ?? 0) + 1;
      });
      return acc;
    }, {});
  }, [resources]);

  const filterSnapshotKey = useMemo(() => {
    const snapshot = {
      categories: Array.from(filters.categories).sort(),
      situations: Array.from(filters.situations).sort(),
      audiences: Array.from(filters.audiences).sort(),
      sort: filters.sort,
    };
    return JSON.stringify(snapshot);
  }, [filters]);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    if (filterSnapshotKey === lastFilterEvent.current) {
      return;
    }
    lastFilterEvent.current = filterSnapshotKey;
    trackLibraryFilters({
      query,
      categories: Array.from(filters.categories),
      situations: Array.from(filters.situations),
      audiences: Array.from(filters.audiences),
      sort: filters.sort,
    });
  }, [filterSnapshotKey, filters, initialized, query]);

  useEffect(() => {
    if (!initialized || loading) {
      return;
    }
    const normalizedQuery = query.trim();
    if (!normalizedQuery || filteredResources.length) {
      lastZeroResultKey.current = "";
      return;
    }
    const key = `${normalizedQuery}|${Array.from(filters.categories).sort().join(",")}|${Array.from(filters.situations)
      .sort()
      .join(",")}|${Array.from(filters.audiences).sort().join(",")}`;
    if (key === lastZeroResultKey.current) {
      return;
    }
    lastZeroResultKey.current = key;
    trackLibraryZeroResult({
      query: normalizedQuery,
      categories: Array.from(filters.categories),
      situations: Array.from(filters.situations),
      audiences: Array.from(filters.audiences),
    });
  }, [filteredResources, filters, initialized, loading, query]);

  return (
    <div className="bg-[var(--color-surface-subtle)] pb-16 pt-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 lg:flex-row lg:px-6">
        <FilterPanel
          state={filters}
          onSortChange={handleSortChange}
          onToggle={handleToggle}
          onReset={handleReset}
          categories={categories}
          categoryCounts={categoryCounts}
          situations={situationOptions}
          situationCounts={situationCounts}
          audiences={audienceTagOptions}
          audienceCounts={audienceCounts}
        />

        <section className="flex-1">
          <LibraryHero
            query={query}
            onQueryChange={handleQueryChange}
            onOpenFilters={() => setIsMobileFiltersOpen(true)}
          />

          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <p className="text-sm text-[var(--color-muted)]">Loading prompts…</p>
            ) : loadError ? (
              <div className="col-span-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-sm text-[var(--color-muted)]">
                  <p className="text-base font-semibold text-[var(--color-foreground)]">Something went wrong</p>
                  <p>{loadError}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : filteredResources.length ? (
              paginatedResources.map((resource) => (
                <article
                  key={resource.id}
                  className="group flex h-full flex-col rounded-2xl bg-[var(--color-primary-background)] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.12)]"
                >
                  <span className="inline-flex self-start rounded-full bg-[var(--color-secondary-background)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                    {resource.category}
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                    <Link href={`/library/${resource.id}`}>{resource.title}</Link>
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-[var(--color-text-secondary)]">
                    {resource.description}
                  </p>
                  <div className="mt-4 flex items-center justify-end text-xs font-semibold">
                    <Link
                      href={`/library/${resource.id}`}
                      className="inline-flex items-center gap-1 text-[var(--color-accent)] transition hover:text-[var(--color-accent-hover)]"
                    >
                      View prompt
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
              <div className="col-span-full overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-sm text-[var(--color-muted)]">
                  <p className="text-base font-semibold text-[var(--color-foreground)]">No prompts match your filters</p>
                  <p>Try a different search or adjust your filters to discover more clinician-built prompts.</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      Clear filters
                    </button>
                  )}
                  <div className="w-full">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Popular searches</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {POPULAR_QUERIES.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!loading && !loadError && filteredResources.length > 0 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 text-sm text-[var(--color-muted)] sm:flex-row">
              <span>
                Showing {showingStart}–{showingEnd} of {totalResults} prompts
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Go to previous page"
                >
                  Previous
                </button>
                <span className="font-medium text-[var(--color-foreground)]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Go to next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <MobileFilterSheet
        open={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        state={filters}
        onSortChange={handleSortChange}
        onToggle={handleToggle}
        onReset={handleReset}
        categories={categories}
        categoryCounts={categoryCounts}
        situations={situationOptions}
        situationCounts={situationCounts}
        audiences={audienceTagOptions}
        audienceCounts={audienceCounts}
      />
    </div>
  );
}

function scoreResource(resource: Resource, query: string, filters: FilterState) {
  let score = 0;
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery) {
    const terms = normalizedQuery.split(/\s+/);
    const haystack = [
      resource.title,
      resource.description,
      ...resource.patientTags,
      ...resource.situationTags,
      ...resource.audienceTags,
    ]
      .join(" ")
      .toLowerCase();

    terms.forEach((term) => {
      if (resource.title.toLowerCase().includes(term)) {
        score += 6;
      }
      if (resource.patientTags.some((tag) => tag.toLowerCase().includes(term))) {
        score += 4;
      }
      if (haystack.includes(term)) {
        score += 1;
      }
    });
  }

  resource.situationTags.forEach((tag) => {
    if (filters.situations.has(tag)) {
      score += 3;
    }
  });

  resource.audienceTags.forEach((tag) => {
    if (filters.audiences.has(tag)) {
      score += 3;
    }
  });

  if (filters.categories.has(resource.categoryId)) {
    score += 4;
  }

  if (resource.createdAt) {
    const createdAt = Date.parse(resource.createdAt);
    if (!Number.isNaN(createdAt)) {
      const daysOld = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysOld / 30);
    }
  }

  return score;
}
