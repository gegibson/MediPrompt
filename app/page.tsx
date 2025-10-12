"use client";

import Link from "next/link";

const trustPoints = [
  {
    title: "Privacy First",
    description:
      "Prompts are static and stored locally, so nothing you copy is tracked or shared. Clear PHI reminders keep every conversation safe.",
  },
  {
    title: "Expertise Driven",
    description:
      "Each template is informed by clinicians and patient advocates to balance evidence-based insight with approachable language.",
  },
  {
    title: "Simple to Use",
    description:
      "Copy a template in seconds and head straight to our healthcare prompt library for deeper filtering whenever you need it.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[var(--color-primary-background)] text-[var(--color-text-primary)]">
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-20 px-5 pb-16 pt-16 sm:px-6 md:px-10 lg:pb-24">
        <section className="flex flex-col items-center gap-6 text-center sm:gap-7">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
            MediPrompt
          </p>
          <div className="flex flex-col gap-4 sm:gap-5">
            <h1 className="text-[42px] font-bold leading-tight tracking-tight sm:text-[46px]">
              Get Better Answers from Healthcare AI
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
              Copy trusted, expert-crafted templates to guide your AI conversations safely and effectively.
            </p>
          </div>
          <Link
            href="/library"
            className="btn-primary"
          >
            Browse Prompt Library
          </Link>
        </section>

        <section className="flex flex-col gap-7 sm:gap-8">
          <div className="text-center">
            <h2 className="text-[32px] font-semibold text-[var(--color-text-primary)] sm:text-[34px]">
              Why Patients Trust MediPrompt
            </h2>
            <p className="mt-3 text-base text-[var(--color-text-secondary)] sm:text-lg">
              Purpose-built guidance that keeps privacy, clarity, and confidence front and center.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <article
                key={point.title}
                className="flex flex-col gap-4 rounded-2xl bg-[var(--color-primary-background)] p-6 text-left shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              >
                <h3 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
                  {point.title}
                </h3>
                <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
                  {point.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
