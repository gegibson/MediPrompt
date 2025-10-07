"use client";

import Link from "next/link";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { trackEvent } from "@/lib/analytics/track";

export default function LandingPage() {
  const { user, supabase, openAuthModal, loading } = useAuthContext();

  const handleCtaClick = (payload: {
    location: string;
    type: "primary" | "secondary" | "nav";
    target: string;
  }) => {
    trackEvent("cta_clicked", payload);
  };

  const handleAuthModalOpen = () => {
    trackEvent("auth_modal_open", { source: "landing-nav" });
    openAuthModal();
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    try {
      await supabase.auth.signOut();
      trackEvent("auth_signed_out", { source: "landing" });
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-7 pt-6 sm:px-6 sm:pb-8 sm:pt-7 md:gap-6 md:px-10 md:pb-10 md:pt-10">
        <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-semibold text-emerald-800 shadow-sm sm:h-11 sm:w-11">
              MP
            </span>
            <div>
              <p className="text-base font-semibold text-slate-800">Mediprompt</p>
              <p className="text-[13px] text-slate-600 sm:text-sm">
                Safer AI prompts for patients & caregivers
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-sm font-medium sm:gap-3">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-300 px-4 py-1.75 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600 sm:px-5 sm:py-2"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAuthModalOpen}
                className="rounded-full border border-emerald-400 px-4 py-1.75 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/60 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:px-5 sm:py-2"
                disabled={loading}
              >
                Sign in
              </button>
            )}
            <Link
              href="/wizard"
              className="rounded-full border border-emerald-400 px-4 py-1.75 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/60 sm:px-5 sm:py-2"
              onClick={() =>
                handleCtaClick({
                  location: "nav",
                  type: "nav",
                  target: "wizard",
                })
              }
            >
              Skip to Wizard
            </Link>
            <Link
              href="/wizard"
              className="rounded-full bg-emerald-600 px-4 py-1.75 text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 sm:px-5 sm:py-2"
              onClick={() =>
                handleCtaClick({
                  location: "nav",
                  type: "nav",
                  target: "wizard",
                })
              }
            >
              Use Wizard
            </Link>
          </div>
        </nav>

        <div className="grid gap-3 md:max-w-2xl md:gap-4">
          <h1 className="text-[2.05rem] font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-[2.15rem] md:text-[2.4rem] lg:text-[2.6rem]">
            Get the Healthcare Answers You Need from AI
          </h1>
          <p className="text-[13.5px] leading-snug text-slate-700 sm:text-sm md:text-base">
            Clinician-designed questions to improve AI responses, such as ChatGPT.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/wizard"
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 sm:px-5 sm:py-2.5"
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
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 pb-12 sm:px-6 sm:pb-14 md:gap-10 md:px-10 md:pb-16 lg:gap-14">
        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 text-slate-800 shadow-lg shadow-emerald-100/40 sm:p-7 md:p-8">
          <div className="grid gap-5 sm:gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)] md:items-center md:gap-8 lg:gap-10">
            <div className="grid gap-3.5 sm:gap-4">
              <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                Ready for prompts tailored to your exact situation?
              </h2>
              <p className="text-sm text-slate-700 sm:text-[15px] md:text-base">
                These free templates stay intentionally broad so anyone can use them without sharing personal details. The Wizard upgrades your experience with context-aware questions, PHI-friendly safety checks, and unlimited prompt generation backed by the same privacy-first principles.
              </p>
              <ul className="grid gap-3 text-[13px] text-slate-700 sm:text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    1
                  </span>
                  <p>
                    Guided intake captures role, goals, tone, and safe background details so every prompt feels personal without storing identifiers.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    2
                  </span>
                  <p>
                    Built-in PHI scanner highlights risky phrasing before you copy, helping you keep conversations compliant across tools.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    3
                  </span>
                  <p>
                    Unlimited prompt generation with reminders for next steps, follow-up questions, and educational context tailored to you.
                  </p>
                </li>
              </ul>
            </div>

            <div className="flex h-full flex-col justify-between rounded-3xl border border-emerald-200 bg-white/80 p-5 text-sm shadow-sm sm:p-6">
              <div className="grid gap-1.5 text-slate-700 sm:gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">
                  Upgrade in minutes
                </span>
                <h3 className="text-xl font-semibold text-slate-900">
                  Wizard access • $9/month
                </h3>
                <p>
                  Stripe-powered checkout. Cancel anytime. We never store payment info or prompt content.
                </p>
              </div>
              <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3">
                <Link
                  href="/wizard"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 sm:px-5 sm:py-2.5"
                  onClick={() =>
                    handleCtaClick({
                      location: "transition",
                      type: "primary",
                      target: "wizard",
                    })
                  }
                >
                  Unlock the Wizard
                </Link>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Educational use only. Avoid sharing names, numbers, or other personal identifiers in any prompt.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white/85 p-6 text-slate-800 shadow-lg shadow-slate-100/40 sm:p-7 md:p-8">
          <div className="mb-5 flex flex-col gap-2.5 text-center sm:mb-6 sm:gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">
              Why patients trust Mediprompt
            </span>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl md:text-3xl">
              Built for privacy, empathy, and clarity
            </h2>
            <p className="mx-auto max-w-2xl text-[13px] text-slate-600 sm:text-sm">
              Every template balances clinical caution with plain-language education so you stay in control of your health conversations.
            </p>
          </div>

          <div className="grid gap-5 sm:gap-6 md:grid-cols-3 md:gap-7">
            <article className="flex flex-col gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">🔒</span>
                <h3 className="text-lg font-semibold text-emerald-900">Privacy First</h3>
              </div>
              <p className="text-[13px] text-emerald-800 sm:text-sm">
                Static prompts mean no chats are stored, tracked, or shared. PHI reminders sit beside every CTA so it&apos;s easy to keep personal data offline.
              </p>
            </article>

            <article className="flex flex-col gap-2.5 rounded-2xl border border-sky-100 bg-sky-50/80 p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">🎓</span>
                <h3 className="text-lg font-semibold text-sky-900">Expertise Driven</h3>
              </div>
              <p className="text-[13px] text-sky-800 sm:text-sm">
                Prompts reference evidence-informed communication best practices and include actionable questions you can confirm with your care team.
              </p>
            </article>

            <article className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✨</span>
                <h3 className="text-lg font-semibold text-slate-900">Simple to Use</h3>
              </div>
              <p className="text-[13px] text-slate-700 sm:text-sm">
                Copy-ready structure, future-friendly filters, and upgrade cues make it easy to browse now and unlock tailored prompts whenever you need them.
              </p>
            </article>
          </div>
        </section>
      </main>

    </div>
  );
}
