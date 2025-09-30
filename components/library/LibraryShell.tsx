"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { trackEvent } from "@/lib/analytics/track";
import { fetchBodyById, getCategories, getIndex } from "@/lib/library/dataClient";
import type { LibraryCategory, PromptIndexItem } from "@/lib/library/types";
import { LibraryProvider, useLibraryActions, useLibraryState } from "@/lib/library/store";
import { searchIndex, type SearchHit } from "@/lib/library/search";

type CopyState = "idle" | "copied" | "error";

type BodyState = {
  status: "idle" | "loading" | "ready" | "error";
  body?: string;
};

const PAGE_SIZE = 6;

export function LibraryShell() {
  return (
    <LibraryProvider>
      <LibrarySection />
    </LibraryProvider>
  );
}

function LibrarySection() {
  const state = useLibraryState();
  const actions = useLibraryActions();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [items, setItems] = useState<PromptIndexItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [bodyStates, setBodyStates] = useState<Record<string, BodyState>>({});
  const [copyStates, setCopyStates] = useState<Record<string, CopyState>>({});

  const copyTimeouts = useRef<Record<string, number>>({});
  const bodyRef = useRef<Record<string, BodyState>>({});
  const hasTrackedViewRef = useRef(false);
  const lastSearchKeyRef = useRef<string>("");

  useEffect(() => {
    bodyRef.current = bodyStates;
  }, [bodyStates]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      const [cats, index] = await Promise.all([getCategories(), getIndex()]);
      if (ignore) return;
      const safeCategories = Array.isArray(cats) ? cats : [];
      const safeIndex = Array.isArray(index) ? index : [];

      setCategories(safeCategories);
      setItems(safeIndex);
      setCategoryCounts(buildCounts(safeIndex));
      if (!hasTrackedViewRef.current) {
        trackEvent("prompt_library_viewed", {
          prompt_count: safeIndex.length,
          category_count: safeCategories.length,
        });
        hasTrackedViewRef.current = true;
      }
      setLoading(false);
    }
    load();
    return () => {
      ignore = true;
      Object.values(copyTimeouts.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        actions.collapseAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);

  // Derived pipeline: Category filter → Search → Sort → Paginate
  const { hits, total } = useMemo(() => {
    const trimmedQuery = state.query.trim();
    const filtered = state.selectedCategories.length
      ? items.filter((item) => state.selectedCategories.includes(item.categoryId))
      : items;

    const baseHits: SearchHit[] = trimmedQuery
      ? searchIndex(filtered, trimmedQuery, { threshold: 0.2 })
      : filtered.map((item) => ({ item, score: 0, highlights: {} }));

    const sorted = applySort(baseHits, state.sort, Boolean(trimmedQuery));
    return {
      hits: sorted,
      total: sorted.length,
    };
  }, [items, state.selectedCategories, state.query, state.sort]);

  const pageSize = PAGE_SIZE;
  const visibleHits = useMemo(() => hits.slice(0, state.page * pageSize), [hits, state.page, pageSize]);
  const hasMore = visibleHits.length < hits.length;

  const promptMap = useMemo(
    () =>
      items.reduce<Record<string, PromptIndexItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [items],
  );

  useEffect(() => {
    const trimmed = state.query.trim();
    if (!trimmed) {
      lastSearchKeyRef.current = "";
      return;
    }
    const filterKey = state.selectedCategories.slice().sort().join("|");
    const key = `${trimmed.length}:${filterKey}:${hits.length}`;
    if (lastSearchKeyRef.current === key) {
      return;
    }
    lastSearchKeyRef.current = key;
    trackEvent("prompt_searched", {
      query_length: trimmed.length,
      matches: hits.length,
      category_filter_count: state.selectedCategories.length,
    });
  }, [state.query, state.selectedCategories, hits.length]);

  // Body helpers
  const ensureBody = async (id: string): Promise<string | null> => {
    const current = bodyRef.current[id];
    if (current?.status === "ready" && current.body) {
      return current.body;
    }
    if (current?.status === "loading") {
      // Wait briefly before attempting again
      return new Promise((resolve) => {
        setTimeout(async () => {
          const refreshed = bodyRef.current[id];
          if (refreshed?.status === "ready" && refreshed.body) {
            resolve(refreshed.body);
            return;
          }
          const fetched = await fetchBody(id);
          resolve(fetched);
        }, 120);
      });
    }
    return fetchBody(id);
  };

  const fetchBody = async (id: string): Promise<string | null> => {
    setBodyStates((prev) => ({
      ...prev,
      [id]: { status: "loading", body: prev[id]?.body },
    }));
    const data = await fetchBodyById(id);
    if (data?.body) {
      setBodyStates((prev) => ({
        ...prev,
        [id]: { status: "ready", body: data.body },
      }));
      return data.body;
    }
    setBodyStates((prev) => ({
      ...prev,
      [id]: { status: "error" },
    }));
    return null;
  };

  const handleToggle = async (id: string) => {
    const isExpanded = !state.expandedPromptIds[id];
    const prompt = promptMap[id];
    trackEvent("prompt_expanded", {
      prompt_id: id,
      category_id: prompt?.categoryId ?? "unknown",
      expanded: isExpanded,
    });

    actions.toggleExpanded(id);
    if (!isExpanded) {
      return;
    }
    if (bodyStates[id]?.status !== "ready") {
      await fetchBody(id);
    }
  };

  const handleCopy = async (id: string) => {
    setCopyStates((prev) => ({ ...prev, [id]: "idle" }));
    const body = await ensureBody(id);
    if (!body) {
      setCopyStates((prev) => ({ ...prev, [id]: "error" }));
      return;
    }
    try {
      await navigator.clipboard.writeText(body);
      setCopyStates((prev) => ({ ...prev, [id]: "copied" }));
      const prompt = promptMap[id];
      trackEvent("prompt_copied", {
        prompt_id: id,
        category_id: prompt?.categoryId ?? "unknown",
      });
      if (copyTimeouts.current[id]) {
        window.clearTimeout(copyTimeouts.current[id]);
      }
      copyTimeouts.current[id] = window.setTimeout(() => {
        setCopyStates((prev) => ({ ...prev, [id]: "idle" }));
      }, 2400);
    } catch (error) {
      console.error("Copy failed", error);
      setCopyStates((prev) => ({ ...prev, [id]: "error" }));
      if (copyTimeouts.current[id]) {
        window.clearTimeout(copyTimeouts.current[id]);
      }
      copyTimeouts.current[id] = window.setTimeout(() => {
        setCopyStates((prev) => ({ ...prev, [id]: "idle" }));
      }, 3200);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm text-slate-600">
        <p>Loading library…</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <header className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-[1.55rem] font-semibold leading-tight text-slate-900 sm:text-[1.6rem] md:text-[1.75rem]">
              Healthcare Library
            </h2>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              General templates • educational only
            </span>
          </div>
          <p className="text-[12.5px] text-slate-600 sm:text-[13px] md:text-sm">
            Browse by category, search, and expand to preview prompts. Copy the full template or jump to the Wizard for customization.
          </p>
        </div>
        <div className="mt-2 text-sm text-slate-500 md:mt-0" role="status" aria-live="polite">
          {total} template{total === 1 ? "" : "s"} found
        </div>
      </header>

      <FilterRow
        categories={categories}
        counts={categoryCounts}
        selected={state.selectedCategories}
        onSelect={(next) => actions.setSelectedCategories(next)}
        onTrackSelect={({ categoryId, categoryName, isActive, selectedCategoryIds, promptCount }) => {
          trackEvent("prompt_category_selected", {
            category_id: categoryId,
            category_name: categoryName,
            is_active: isActive,
            selected_category_count: selectedCategoryIds.length,
            prompt_count: promptCount,
          });
        }}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchBar value={state.query} onChange={(next) => actions.setQuery(next)} />
        <SortControl value={state.sort} onChange={(next) => actions.setSort(next)} />
      </div>

      <ResultsGrid
        hits={visibleHits}
        categories={categories}
        expanded={state.expandedPromptIds}
        bodyStates={bodyStates}
        copyStates={copyStates}
        onToggle={handleToggle}
        onCopy={handleCopy}
      />

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => actions.setPage(state.page + 1)}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            Load more
          </button>
        </div>
      )}

      {!visibleHits.length && (
        <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-9 text-center text-sm text-slate-600">
          No prompts match your filters yet. Try adjusting categories or search terms, or build a custom prompt in the Wizard.
          <div className="mt-3">
            <Link
              href="/wizard"
              className="text-emerald-700 underline"
              onClick={() =>
                trackEvent("cta_clicked", {
                  location: "library-empty",
                  type: "secondary",
                  target: "wizard",
                })
              }
            >
              Open Wizard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

type CategorySelectEvent = {
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  selectedCategoryIds: string[];
  promptCount: number;
};

function FilterRow({
  categories,
  counts,
  selected,
  onSelect,
  onTrackSelect,
}: {
  categories: LibraryCategory[];
  counts: Record<string, number>;
  selected: string[];
  onSelect: (ids: string[]) => void;
  onTrackSelect?: (payload: CategorySelectEvent) => void;
}) {
  const allActive = selected.length === 0;
  const totalPrompts = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const toggleCategory = (id: string) => {
    const category = categories.find((entry) => entry.id === id);
    if (!category) {
      return;
    }
    const isAlreadySelected = selected.includes(id);
    const next = isAlreadySelected ? selected.filter((item) => item !== id) : [...selected, id];
    onSelect(next);
    onTrackSelect?.({
      categoryId: category.id,
      categoryName: category.name,
      isActive: !isAlreadySelected,
      selectedCategoryIds: next,
      promptCount: counts[category.id] ?? 0,
    });
  };

  return (
    <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
      <div className="flex w-max items-center gap-1.5 px-1 sm:w-auto sm:flex-wrap sm:px-0">
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.25 text-[12.5px] font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
            allActive
              ? "border-emerald-400 bg-emerald-100/70 text-emerald-800 shadow"
              : "border-slate-200 bg-white/80 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
          }`}
          aria-pressed={allActive}
          onClick={() => {
            onSelect([]);
            onTrackSelect?.({
              categoryId: "all",
              categoryName: "All",
              isActive: true,
              selectedCategoryIds: [],
              promptCount: totalPrompts,
            });
          }}
        >
          <span className="text-base leading-none">✨</span>
          <span>All</span>
          <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
            {totalPrompts}
          </span>
        </button>

        {categories.map((category) => {
          const isSelected = selected.includes(category.id);
          const count = counts[category.id] ?? 0;
          return (
            <button
              key={category.id}
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.25 text-[12.5px] font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                isSelected
                  ? "border-emerald-400 bg-emerald-100/70 text-emerald-800 shadow"
                  : "border-slate-200 bg-white/80 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
              }`}
              aria-pressed={isSelected}
              onClick={() => toggleCategory(category.id)}
              title={category.description ?? ""}
            >
              <span className="text-base leading-none">{category.icon}</span>
              <span>{category.name}</span>
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  return (
    <div className="w-full max-w-sm" role="search" aria-label="Prompt library search">
      <label className="sr-only" htmlFor="library-search-input">
        Search prompt library
      </label>
      <div className="relative">
        <input
          id="library-search-input"
          type="search"
          placeholder="Search prompts (e.g., medications, billing)"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-1.75 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
            onClick={() => onChange("")}
          >
            ✕
          </button>
        ) : (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400" aria-hidden="true">
            🔍
          </span>
        )}
      </div>
    </div>
  );
}

function SortControl({ value, onChange }: { value: "featured" | "newest" | "title"; onChange: (sort: "featured" | "newest" | "title") => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="library-sort" className="text-slate-600">
        Sort by
      </label>
      <select
        id="library-sort"
        value={value}
        onChange={(event) => onChange(event.target.value as "featured" | "newest" | "title")}
        className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none"
      >
        <option value="featured">Featured</option>
        <option value="newest">Newest</option>
        <option value="title">Title A–Z</option>
      </select>
    </div>
  );
}

function ResultsGrid({
  hits,
  categories,
  expanded,
  bodyStates,
  copyStates,
  onToggle,
  onCopy,
}: {
  hits: SearchHit[];
  categories: LibraryCategory[];
  expanded: Record<string, boolean>;
  bodyStates: Record<string, BodyState>;
  copyStates: Record<string, CopyState>;
  onToggle: (id: string) => void;
  onCopy: (id: string) => void;
}) {
  const categoryMap = useMemo(
    () =>
      categories.reduce<Record<string, LibraryCategory>>((acc, category) => {
        acc[category.id] = category;
        return acc;
      }, {}),
    [categories],
  );

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-3.5 md:gap-4 xl:grid-cols-3 xl:gap-4" role="list">
      {hits.map((hit) => (
        <PromptCard
          key={hit.item.id}
          hit={hit}
          category={categoryMap[hit.item.categoryId]}
          isExpanded={Boolean(expanded[hit.item.id])}
          bodyState={bodyStates[hit.item.id] ?? { status: "idle" }}
          copyState={copyStates[hit.item.id] ?? "idle"}
          onToggle={() => onToggle(hit.item.id)}
          onCopy={() => onCopy(hit.item.id)}
          ariaId={`prompt-body-${hit.item.id}`}
        />
      ))}
    </div>
  );
}

function PromptCard({
  hit,
  category,
  isExpanded,
  bodyState,
  copyState,
  onToggle,
  onCopy,
  ariaId,
}: {
  hit: SearchHit;
  category?: LibraryCategory;
  isExpanded: boolean;
  bodyState: BodyState;
  copyState: CopyState;
  onToggle: () => void;
  onCopy: () => void;
  ariaId: string;
}) {
  const highlightedTitle = renderHighlighted(hit.item.title, hit.highlights.title);
  const highlightedDescription = renderHighlighted(hit.item.shortDescription, hit.highlights.shortDescription);

  return (
    <article
      className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none"
      role="listitem"
    >
      <div className="mb-3 grid gap-1.75">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
            <span>{category?.icon ?? "📌"}</span>
            <span>{category?.name ?? "Prompt"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">
            General Template
          </span>
        </div>
        <div className="grid gap-1.5">
          <h3 className="text-[1.05rem] font-semibold leading-snug text-slate-900" title={hit.item.title}>
            {highlightedTitle}
          </h3>
          <p className="text-[12px] leading-snug text-slate-600" title={hit.item.shortDescription}>
            {highlightedDescription}
          </p>
        </div>
      </div>

      <div className="relative flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-[12px] leading-relaxed text-slate-700">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Prompt preview</p>
        <PreviewBody isExpanded={isExpanded} bodyState={bodyState} ariaId={ariaId} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
        <div className="flex flex-wrap items-center gap-1">
          {hit.item.tags?.map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 lowercase text-slate-600">
              #{tag}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] normal-case">
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
              copyState === "copied"
                ? "border-emerald-400 bg-emerald-100/70 text-emerald-700"
                : copyState === "error"
                  ? "border-rose-300 bg-rose-50 text-rose-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
            }`}
            onClick={onCopy}
            aria-live="polite"
          >
            {copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy prompt"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            aria-expanded={isExpanded}
            aria-controls={ariaId}
            onClick={onToggle}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
    </article>
  );
}

function PreviewBody({ isExpanded, bodyState, ariaId }: { isExpanded: boolean; bodyState: BodyState; ariaId: string }) {
  if (bodyState.status === "loading") {
    return (
      <div className="mt-2 space-y-2">
        <div className="h-3 rounded bg-slate-200/80" />
        <div className="h-3 rounded bg-slate-200/70" />
        <div className="h-3 rounded bg-slate-200/60" />
      </div>
    );
  }

  if (bodyState.status === "error") {
    return <p className="mt-2 text-[11px] text-rose-600">Prompt body unavailable. Try again later.</p>;
  }

  const body = bodyState.body ?? "Prompt will load when expanded or copied.";

  return (
    <>
      <p
        className={`mt-2 whitespace-pre-line transition-[max-height] duration-300 ease-out ${
          isExpanded ? "max-h-[1200px]" : "max-h-32 overflow-hidden"
        }`}
        id={ariaId}
      >
        {body}
      </p>
      {!isExpanded && (
        <div className="pointer-events-none absolute inset-x-3.5 bottom-3.5 h-7 bg-gradient-to-t from-slate-50/90 to-slate-50/0" aria-hidden="true" />
      )}
    </>
  );
}

function renderHighlighted(text: string, ranges?: { start: number; end: number }[]) {
  if (!ranges || ranges.length === 0) return text;
  const parts: Array<string | JSX.Element> = [];
  let cursor = 0;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  sorted.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push(text.slice(cursor, range.start));
    }
    parts.push(
      <mark key={`hl-${index}`} className="rounded bg-emerald-100 px-0.5 text-emerald-800">
        {text.slice(range.start, Math.min(range.end, text.length))}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return <>{parts}</>;
}

function buildCounts(items: PromptIndexItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.categoryId] = (acc[item.categoryId] ?? 0) + 1;
    return acc;
  }, {});
}

function applySort(hits: SearchHit[], sort: "featured" | "newest" | "title", hasQuery: boolean): SearchHit[] {
  const sorted = [...hits];
  const toDate = (value?: string) => (value ? Date.parse(value) || 0 : 0);

  if (hasQuery) {
    // When searching, keep relevance but allow tie-breakers via sort option.
    sorted.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.1) {
        return b.score - a.score;
      }
      if (sort === "title") {
        return a.item.title.localeCompare(b.item.title);
      }
      if (sort === "newest") {
        return toDate(b.item.createdAt) - toDate(a.item.createdAt);
      }
      const fwDiff = (b.item.featuredWeight ?? 0) - (a.item.featuredWeight ?? 0);
      if (fwDiff !== 0) return fwDiff;
      return toDate(b.item.createdAt) - toDate(a.item.createdAt);
    });
    return sorted;
  }

  if (sort === "title") {
    sorted.sort((a, b) => a.item.title.localeCompare(b.item.title));
    return sorted;
  }

  if (sort === "newest") {
    sorted.sort((a, b) => toDate(b.item.createdAt) - toDate(a.item.createdAt));
    return sorted;
  }

  sorted.sort((a, b) => {
    const fwDiff = (b.item.featuredWeight ?? 0) - (a.item.featuredWeight ?? 0);
    if (fwDiff !== 0) return fwDiff;
    const createdDiff = toDate(b.item.createdAt) - toDate(a.item.createdAt);
    if (createdDiff !== 0) return createdDiff;
    return a.item.title.localeCompare(b.item.title);
  });
  return sorted;
}
