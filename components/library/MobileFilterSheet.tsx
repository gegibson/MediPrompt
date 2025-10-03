"use client";

import { useEffect } from "react";

import {
  audienceOptions,
  categoryOptions,
  contentTypeOptions,
  languageOptions,
  sortOptions,
  type FilterGroupKey,
  type FilterState,
  type FacetOption,
} from "./FilterPanel";

type MobileFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  state: FilterState;
  onSortChange: (sort: string) => void;
  onToggle: (group: FilterGroupKey, value: string) => void;
  onReset: () => void;
};

export function MobileFilterSheet({
  open,
  onClose,
  state,
  onSortChange,
  onToggle,
  onReset,
}: MobileFilterSheetProps) {

  useEffect(() => {
    if (!open) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const closeWithCleanup = () => {
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={closeWithCleanup}
        aria-hidden="true"
      />
      <div className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">Filters</h2>
          <button
            type="button"
            onClick={closeWithCleanup}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-[var(--color-muted)] transition hover:border-slate-300 hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-label="Close filters"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="m15 9-6 6m0-6 6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Sort By
            </span>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-subtle)]"
                >
                  <input
                    type="radio"
                    name="mobile-library-sort"
                    value={option.id}
                    checked={state.sort === option.id}
                    onChange={() => onSortChange(option.id)}
                    className="h-4 w-4 border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </section>

          <MobileFacetGroup
            title="Medical Categories"
            options={categoryOptions}
            selected={state.categories}
            onToggle={(value) => onToggle("categories", value)}
          />

          <MobileFacetGroup
            title="Content Type"
            options={contentTypeOptions}
            selected={state.types}
            onToggle={(value) => onToggle("types", value)}
          />

          <MobileFacetGroup
            title="Audience"
            options={audienceOptions}
            selected={state.audience}
            onToggle={(value) => onToggle("audience", value)}
          />

          <MobileFacetGroup
            title="Language"
            options={languageOptions}
            selected={state.languages}
            onToggle={(value) => onToggle("languages", value)}
          />
        </div>

        <footer className="space-y-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={closeWithCleanup}
            className="w-full rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Apply Filters
          </button>
        </footer>
      </div>
    </div>
  );
}

type MobileFacetGroupProps = {
  title: string;
  options: FacetOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
};

function MobileFacetGroup({ title, options, selected, onToggle }: MobileFacetGroupProps) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
      <div className="mt-3 space-y-2">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-subtle)]"
          >
            <input
              type="checkbox"
              checked={selected.has(option.id)}
              onChange={() => onToggle(option.id)}
              className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
