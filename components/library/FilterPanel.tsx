"use client";

import { useMemo, useState } from "react";

export type SortOption = {
  id: string;
  label: string;
};

export type FacetOption = {
  id: string;
  label: string;
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export const sortOptions: SortOption[] = [
  { id: "relevance", label: "Relevance" },
  { id: "title-asc", label: "Title A-Z" },
  { id: "title-desc", label: "Title Z-A" },
  { id: "recent", label: "Most Recent" },
  { id: "popular", label: "Most Popular" },
];

export const categoryOptions: FacetOption[] = [
  { id: "primary-care", label: "Primary Care" },
  { id: "pediatrics", label: "Pediatrics" },
  { id: "mental-health", label: "Mental Health" },
  { id: "chronic", label: "Chronic Conditions" },
  { id: "preventive", label: "Preventive Care" },
  { id: "emergency", label: "Emergency Care" },
  { id: "specialty", label: "Specialty Care" },
];

export type FilterState = {
  sort: string;
  categories: Set<string>;
};

export function createDefaultState(): FilterState {
  return {
    sort: sortOptions[0].id,
    categories: new Set<string>(),
  };
}

export function cloneFilterState(source: FilterState): FilterState {
  return {
    sort: source.sort,
    categories: new Set(source.categories),
  };
}

export type FilterGroupKey = "categories";

type ActiveBadge = {
  id: string;
  label: string;
  group: FilterGroupKey;
};

type FilterPanelProps = {
  state: FilterState;
  onSortChange: (sort: string) => void;
  onToggle: (group: FilterGroupKey, value: string) => void;
  onReset: () => void;
  categories?: FacetOption[];
  categoryCounts?: Record<string, number>;
};

export function FilterPanel({ state, onSortChange, onToggle, onReset, categories, categoryCounts }: FilterPanelProps) {
  const categoriesList = categories && categories.length ? categories : categoryOptions;

  const categoryLookup = useMemo(() => {
    return new Map(categoriesList.map((option) => [option.id, option.label]));
  }, [categoriesList]);

  const activeBadges = useMemo<ActiveBadge[]>(() => {
    const badges: ActiveBadge[] = [];

    state.categories.forEach((id) => {
      const label = categoryLookup.get(id);
      if (label) {
        badges.push({ id, label, group: "categories" });
      }
    });

    return badges;
  }, [state, categoryLookup]);

  const removeBadge = (badge: ActiveBadge) => {
    onToggle(badge.group, badge.id);
  };

  return (
    <aside className="hidden w-full max-w-xs lg:block">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Filters
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Narrow the healthcare library by specialty, format, and audience.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-[var(--color-primary)] transition hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Reset
          </button>
        </div>

        {activeBadges.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeBadges.map((badge) => (
              <button
                key={`${badge.group}-${badge.id}`}
                type="button"
                onClick={() => removeBadge(badge)}
                className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[var(--color-surface-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-slate-300 hover:bg-white hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                {badge.label}
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white transition group-hover:bg-[var(--color-primary)]">
                  ×
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6 space-y-6">
          <FilterSection title="Sort By" defaultOpen>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-subtle)]"
                >
                  <input
                    type="radio"
                    name="library-sort"
                    value={option.id}
                    checked={state.sort === option.id}
                    onChange={() => onSortChange(option.id)}
                    className="h-4 w-4 border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Medical Categories" defaultOpen>
            <div className="space-y-2">
              {categoriesList.map((option) => {
                const count = categoryCounts && Object.prototype.hasOwnProperty.call(categoryCounts, option.id)
                  ? categoryCounts[option.id]
                  : undefined;
                return (
                <FacetCheckbox
                  key={option.id}
                  checked={state.categories.has(option.id)}
                  label={option.label}
                  count={count}
                  onToggle={() => onToggle("categories", option.id)}
                />
                );
              })}
            </div>
          </FilterSection>

        </div>
      </div>
    </aside>
  );
}

function FilterSection({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-slate-100 pb-4 last:border-none last:pb-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-[var(--color-foreground)]"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {title}
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

type FacetCheckboxProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  count?: number;
};

function FacetCheckbox({ label, checked, onToggle, count }: FacetCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-subtle)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
      />
      <span>
        {label}
        {typeof count === "number" ? ` (${count})` : ""}
      </span>
    </label>
  );
}
