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

export const contentTypeOptions: FacetOption[] = [
  { id: "articles", label: "Articles" },
  { id: "videos", label: "Videos" },
  { id: "guidelines", label: "Guidelines" },
  { id: "research", label: "Research Papers" },
  { id: "handouts", label: "Patient Handouts" },
  { id: "tools", label: "Interactive Tools" },
];

export const audienceOptions: FacetOption[] = [
  { id: "patients", label: "Patients" },
  { id: "caregivers", label: "Caregivers" },
  { id: "clinicians", label: "Healthcare Professionals" },
  { id: "students", label: "Students" },
];

export const languageOptions: FacetOption[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "other", label: "Other Languages" },
];

export type FilterState = {
  sort: string;
  categories: Set<string>;
  types: Set<string>;
  audience: Set<string>;
  languages: Set<string>;
};

export function createDefaultState(): FilterState {
  return {
    sort: sortOptions[0].id,
    categories: new Set<string>(),
    types: new Set<string>(),
    audience: new Set<string>(),
    languages: new Set<string>(),
  };
}

export function cloneFilterState(source: FilterState): FilterState {
  return {
    sort: source.sort,
    categories: new Set(source.categories),
    types: new Set(source.types),
    audience: new Set(source.audience),
    languages: new Set(source.languages),
  };
}

export type FilterGroupKey = keyof Omit<FilterState, "sort">;

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
};

export function FilterPanel({ state, onSortChange, onToggle, onReset }: FilterPanelProps) {
  const activeBadges = useMemo<ActiveBadge[]>(() => {
    const badges: ActiveBadge[] = [];

    state.categories.forEach((id) => {
      const match = categoryOptions.find((option) => option.id === id);
      if (match) {
        badges.push({ id, label: match.label, group: "categories" });
      }
    });

    state.types.forEach((id) => {
      const match = contentTypeOptions.find((option) => option.id === id);
      if (match) {
        badges.push({ id, label: match.label, group: "types" });
      }
    });

    state.audience.forEach((id) => {
      const match = audienceOptions.find((option) => option.id === id);
      if (match) {
        badges.push({ id, label: match.label, group: "audience" });
      }
    });

    state.languages.forEach((id) => {
      const match = languageOptions.find((option) => option.id === id);
      if (match) {
        badges.push({ id, label: match.label, group: "languages" });
      }
    });

    return badges;
  }, [state]);

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
              {categoryOptions.map((option) => (
                <FacetCheckbox
                  key={option.id}
                  checked={state.categories.has(option.id)}
                  label={option.label}
                  onToggle={() => onToggle("categories", option.id)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Content Type">
            <div className="space-y-2">
              {contentTypeOptions.map((option) => (
                <FacetCheckbox
                  key={option.id}
                  checked={state.types.has(option.id)}
                  label={option.label}
                  onToggle={() => onToggle("types", option.id)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Audience">
            <div className="space-y-2">
              {audienceOptions.map((option) => (
                <FacetCheckbox
                  key={option.id}
                  checked={state.audience.has(option.id)}
                  label={option.label}
                  onToggle={() => onToggle("audience", option.id)}
                />
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Language">
            <div className="space-y-2">
              {languageOptions.map((option) => (
                <FacetCheckbox
                  key={option.id}
                  checked={state.languages.has(option.id)}
                  label={option.label}
                  onToggle={() => onToggle("languages", option.id)}
                />
              ))}
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
};

function FacetCheckbox({ label, checked, onToggle }: FacetCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-subtle)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
      />
      <span>{label}</span>
    </label>
  );
}
