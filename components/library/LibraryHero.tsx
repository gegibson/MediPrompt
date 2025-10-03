"use client";

import Link from "next/link";

type LibraryHeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters?: () => void;
};

export function LibraryHero({ query, onQueryChange, onOpenFilters }: LibraryHeroProps) {
  return (
    <header className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[var(--color-primary)] text-white shadow-sm">
        <div className="relative flex flex-col gap-4 px-6 py-10 sm:px-10">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2)_0%,_rgba(255,255,255,0)_70%)]"
            aria-hidden="true"
          />
          <h1 className="relative max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Healthcare Prompt Library
          </h1>
          <p className="relative max-w-3xl text-base text-white/90 sm:text-lg">
            Get better answers about your health with AI prompts designed by clinicians.
          </p>
        </div>
      </div>

      <form
        className="flex w-full max-w-2xl overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search healthcare prompts (e.g., intake, pediatrics, follow-up)"
          className="flex-1 bg-transparent px-5 py-3 text-base text-[var(--color-foreground)] focus:outline-none"
          aria-label="Search healthcare prompts"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center bg-[var(--color-primary)] px-5 text-white transition hover:bg-[var(--color-primary)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Search"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M20 20 16.65 16.65"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 6h16M7 12h10M10 18h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Filters
        </button>
        <Link
          href="/library/categories"
          className="hidden text-sm font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-accent)] sm:inline-flex"
        >
          Browse categories
        </Link>
      </div>
    </header>
  );
}
