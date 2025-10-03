import Link from "next/link";
import type { Metadata } from "next";

import { buildCanonicalPath } from "@/lib/config/site";
import { getServerCategories, getServerCategoryCounts } from "@/lib/library/serverData";

export const metadata: Metadata = {
  title: "Browse Library Categories | MediPrompt",
  description: "Explore clinician-crafted AI prompt categories to jump-start your next health conversation.",
  alternates: {
    canonical: buildCanonicalPath("/library/categories"),
  },
};

export default async function LibraryCategoriesPage() {
  const [categories, categoryCounts] = await Promise.all([
    getServerCategories(),
    getServerCategoryCounts(),
  ]);

  return (
    <div className="bg-[var(--color-surface-subtle)] pb-16 pt-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 sm:px-6">
        <header className="space-y-4 text-center">
          <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)]/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            Prompt library
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
            Browse categories curated by clinicians
          </h1>
          <p className="mx-auto max-w-2xl text-base text-[var(--color-muted)]">
            Start from a topic that matches your care moment. Each category groups prompts you can copy
            into your AI assistant to prepare, follow up, or advocate for yourself.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {categories.length ? categories.map((category) => {
            const count = categoryCounts[category.id] ?? 0;
            return (
              <article
                key={category.id}
                className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div className="flex flex-col gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-2xl">
                    <span aria-hidden="true">{category.icon}</span>
                  </span>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-[var(--color-foreground)]">{category.name}</h2>
                    <p className="text-sm text-[var(--color-muted)]">{category.description}</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between text-sm text-[var(--color-muted)]">
                  <span>{count} prompt{count === 1 ? "" : "s"}</span>
                  <Link
                    href={`/library?category=${encodeURIComponent(category.id)}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 font-semibold text-[var(--color-primary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  >
                    View prompts
                    <svg
                      className="h-4 w-4"
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
            );
          }) : (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-[var(--color-muted)]">
              Categories will appear here once the library content is published.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
