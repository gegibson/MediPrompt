import Link from "next/link";
import type { Metadata } from "next";

import { LibraryShell } from "@/components/library/LibraryShell";
import { SiteHeader } from "@/components/site/SiteHeader";
import { isLibraryEnabled } from "@/lib/library/flags";

export const metadata: Metadata = {
  title: "Patient Question Templates — Mediprompt",
  description:
    "Explore clinician-reviewed patient question templates that help you ask clearly while keeping personal health information private.",
};

export default function TemplatesPage() {
  const libraryEnabled = isLibraryEnabled();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[color:var(--color-primary-light)] via-[color:var(--background)] to-[color:var(--color-secondary-light)] text-slate-900">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 md:px-10 lg:pb-20">
        <header className="grid gap-2 text-slate-700">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-[2.3rem]">
            Patient question templates
          </h1>
          <p className="max-w-3xl text-sm sm:text-base">
            Explore clinician-reviewed prompts you can copy and adapt while keeping personal health information private.
          </p>
        </header>
        <main className="grid gap-6 sm:gap-7">
          {libraryEnabled ? (
            <section className="rounded-3xl border border-primary-light bg-white/95 p-4 shadow-2xl backdrop-blur-sm sm:p-6 md:p-7">
              <LibraryShell />
            </section>
          ) : (
            <section className="rounded-3xl border border-primary-light bg-white/95 p-8 text-center shadow-xl sm:p-9">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
                Coming soon
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
                Question Templates are almost here
              </h2>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                We&apos;re finalizing a patient-friendly library so you can browse categories, filter by topic, and copy with confidence.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                  Need something custom right now?
                </p>
                <Link
                  href="/wizard"
                  className="inline-flex items-center justify-center rounded-full btn-primary px-5 py-2.5 text-sm font-semibold"
                >
                  Launch the Guided Builder
                </Link>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Keep PHI offline. Share questions with your clinician for medical advice.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
