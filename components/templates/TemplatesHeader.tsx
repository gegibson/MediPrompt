"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/analytics/track";

export function TemplatesHeader() {
  const handleCtaClick = (payload: {
    location: string;
    type: "primary" | "secondary" | "nav";
    target: string;
  }) => {
    trackEvent("cta_clicked", payload);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 md:px-10">
      <div className="grid gap-6 rounded-3xl border border-primary-light bg-white/95 p-6 shadow-lg backdrop-blur-sm sm:p-7 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:p-8">
        <div className="grid gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
              Question Templates
            </span>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-[2.3rem]">
              Browse questions designed to keep PHI private.
            </h1>
          </div>
          <p className="text-sm text-slate-600 sm:text-base">
            Explore clinician-reviewed prompts by topic, tone, and complexity. Every template stays HIPAA-conscious so you can prepare for appointments with peace of mind.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/wizard"
              className="text-sm font-semibold text-primary underline decoration-[color:var(--color-primary-light)] decoration-2 underline-offset-4 transition hover:text-primary-dark"
              onClick={() =>
                handleCtaClick({
                  location: "templates-hero",
                  type: "primary",
                  target: "wizard",
                })
              }
            >
              Launch the Guided Builder
            </Link>
            <Link
              href="/privacy"
              className="text-sm font-medium text-slate-600 transition hover:text-primary-dark"
              onClick={() =>
                handleCtaClick({
                  location: "templates-hero",
                  type: "secondary",
                  target: "privacy",
                })
              }
            >
              Read our privacy stance
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-primary-light bg-primary-light/70 p-5 text-[13px] text-slate-800 shadow-sm sm:text-sm">
          <p className="font-semibold text-primary">HIPAA-conscious reminder</p>
          <p className="mt-2 text-slate-700">
            Keep your questions general. Avoid names, dates, addresses, or any protected health information before you copy and share a prompt.
          </p>
          <p className="mt-3 text-slate-700">
            Sharing with a clinician? Mention Mediprompt so they know the prompt was generated without storing your data.
          </p>
        </div>
      </div>
    </section>
  );
}
