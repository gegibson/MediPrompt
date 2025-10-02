"use client";

import Link from "next/link";

import { SiteHeader } from "@/components/site/SiteHeader";
import { trackEvent } from "@/lib/analytics/track";

export default function LandingPage() {
  const handleCtaClick = (payload: {
    location: string;
    type: "primary" | "secondary" | "nav";
    target: string;
  }) => {
    trackEvent("cta_clicked", payload);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[color:var(--color-primary-light)] via-[color:var(--background)] to-[color:var(--color-secondary-light)] text-slate-900">
      <SiteHeader />

      <section className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 md:px-10">
        <div className="grid gap-3 md:max-w-2xl md:gap-4">
          <h1 className="text-[2.05rem] font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-[2.15rem] md:text-[2.4rem] lg:text-[2.6rem]">
            Get the Healthcare Answers You Need from AI
          </h1>
          <p className="text-[13.5px] leading-snug text-slate-600 sm:text-sm md:text-base">
            Clinician-designed questions to improve AI responses, such as ChatGPT.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/wizard"
              className="inline-flex items-center justify-center rounded-full btn-primary px-4 py-2 text-sm font-semibold sm:px-5 sm:py-2.5"
              onClick={() =>
                handleCtaClick({
                  location: "hero",
                  type: "primary",
                  target: "wizard",
                })
              }
            >
              Build My Custom Prompt
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center justify-center rounded-full border border-primary-light px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary-light/60 focus:outline-none focus:ring-2 focus:ring-primary-light sm:px-5 sm:py-2.5"
              onClick={() =>
                handleCtaClick({
                  location: "hero",
                  type: "secondary",
                  target: "templates",
                })
              }
            >
              Browse Question Templates
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 pb-12 pt-10 sm:px-6 sm:pb-14 sm:pt-12 md:gap-10 md:px-10 md:pb-16 md:pt-14 lg:gap-14">
        <section className="rounded-3xl border border-primary-light bg-gradient-to-br from-[color:var(--color-primary-light)] via-white to-[color:var(--color-secondary-light)] p-6 text-slate-800 shadow-lg sm:p-7 md:p-8">
          <div className="grid gap-5 sm:gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)] md:items-center md:gap-8 lg:gap-10">
            <div className="grid gap-3.5 sm:gap-4">
              <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                Ready for prompts tailored to your exact situation?
              </h2>
              <p className="text-sm text-slate-700 sm:text-[15px] md:text-base">
                Templates keep things general. The Guided Builder layers on your symptoms, medications, tone, and next steps without ever storing protected health information.
              </p>
              <ul className="grid gap-3 text-[13px] text-slate-700 sm:text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                    1
                  </span>
                  <p>
                    Guided check-ins capture your goal, audience, and safety needs so each AI conversation starts with the right context.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                    2
                  </span>
                  <p>
                    PHI guardrails warn if you start typing names, dates, or identifiers before you ever copy a prompt.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-semibold text-accent">
                    3
                  </span>
                  <p>
                    Smart follow-ups give you gentle reminders for clinician conversations, symptom logs, and emergency escalation language.
                  </p>
                </li>
              </ul>
            </div>

            <div className="flex h-full flex-col justify-between rounded-3xl border border-primary-light bg-white/95 p-5 text-sm shadow-md sm:p-6">
              <div className="grid gap-1.5 text-slate-700 sm:gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
                  Upgrade in minutes
                </span>
                <h3 className="text-xl font-semibold text-slate-900">
                  Guided Builder • $9/month
                </h3>
                <p>
                  Stripe-powered checkout. Cancel anytime. We never store your questions or payment details.
                </p>
              </div>
              <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3">
                <Link
                  href="/wizard"
                  className="inline-flex items-center justify-center rounded-full btn-primary px-4 py-2 text-sm font-semibold sm:px-5 sm:py-2.5"
                  onClick={() =>
                    handleCtaClick({
                      location: "transition",
                      type: "primary",
                      target: "wizard",
                    })
                  }
                >
                  Unlock the Builder
                </Link>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Informational use only. Keep PHI offline and check answers with your clinician.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-slate-800 shadow-lg shadow-slate-900/10 sm:p-7 md:p-8">
          <div className="mb-5 flex flex-col gap-2.5 text-center sm:mb-6 sm:gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
              Why patients trust Mediprompt
            </span>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl md:text-3xl">
              Built for privacy, empathy, and clarity
            </h2>
            <p className="mx-auto max-w-2xl text-[13px] text-slate-600 sm:text-sm">
              Every template balances plain-language education with clinical caution so you stay informed without oversharing.
            </p>
          </div>

          <div className="grid gap-5 sm:gap-6 md:grid-cols-3 md:gap-7">
            <article className="flex flex-col gap-2.5 rounded-2xl border border-primary-light bg-primary-light/70 p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">🔒</span>
                <h3 className="text-lg font-semibold text-primary">Privacy first</h3>
              </div>
              <p className="text-[13px] text-slate-700 sm:text-sm">
                No chat history, no prompt storage, and PHI reminders beside every CTA so you know exactly what to keep private.
              </p>
            </article>

            <article className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">🎓</span>
                <h3 className="text-lg font-semibold text-slate-900">Clinician reviewed</h3>
              </div>
              <p className="text-[13px] text-slate-700 sm:text-sm">
                Prompt patterns reflect guidance from nurses, physicians, and patient advocates to keep questions respectful and actionable.
              </p>
            </article>

            <article className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700">✨</span>
                <h3 className="text-lg font-semibold text-slate-900">Easy to act on</h3>
              </div>
              <p className="text-[13px] text-slate-700 sm:text-sm">
                Copy-ready sections, shareable checklists, and upgrade cues make it simple to move from research to clinician follow-up.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-7 text-[11px] text-slate-500 sm:px-6 sm:py-8 sm:text-xs md:flex-row md:items-center md:justify-between md:px-10">
          <div className="max-w-xl space-y-2">
            <p className="font-semibold uppercase tracking-wide text-primary">
              Informational only • Not medical advice
            </p>
            <p>
              Mediprompt is HIPAA-conscious and does not collect or store prompt content. Keep names, dates, ID numbers, and other PHI out of every question you copy.
            </p>
            <p>
              If you have an emergency, call your local emergency number or visit the nearest hospital immediately.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 font-medium text-slate-600 sm:gap-4">
            <Link href="/privacy" className="transition hover:text-primary-dark">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-primary-dark">
              Terms
            </Link>
            <Link href="/disclaimer" className="transition hover:text-primary-dark">
              Disclaimer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
