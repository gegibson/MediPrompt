"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export function SiteFooter() {
  const [submitted, setSubmitted] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get("email");
    if (typeof email === "string" && email.trim()) {
      setSubmitted(true);
      form.reset();
    }
  };

  return (
    <footer className="border-t border-white/15 bg-[var(--color-primary)]">
      <div className="mx-auto w-full max-w-5xl px-5 py-12 text-white sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
              MediPrompt
            </div>
            <h2 className="text-xl font-semibold sm:text-2xl">
              Safer health conversations start with better prompts.
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/80">
              We craft clinician-informed language so you can ask sharper questions, respect privacy, and stay confident in every AI chat.
            </p>
          </div>

          <form
            className="space-y-3"
            onSubmit={handleSubmit}
            aria-label="Join the Mediprompt newsletter"
          >
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Stay in the loop
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="footer-email">
                Email address
              </label>
              <input
                id="footer-email"
                name="email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                required
                className="flex-1 rounded-full border border-slate-100 bg-white px-4 py-3 text-sm text-[var(--color-foreground)] shadow-sm transition hover:border-slate-200 focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--color-primary)] shadow-sm transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Notify Me
              </button>
            </div>
            <p className="text-xs text-white/70">
              No spam, just product launches and clinician insights. Unsubscribe anytime.
            </p>
            {submitted ? (
              <p className="text-xs font-medium text-white">
                Thanks! We&apos;ll share beta updates soon.
              </p>
            ) : null}
          </form>
        </div>

        <div className="mt-12 border-t border-white/15 pt-8">
          <div className="flex flex-col gap-6 text-xs text-white/70 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="leading-relaxed">
                Mediprompt is educational only and not a substitute for licensed medical advice, diagnosis, or treatment. We are not a HIPAA covered entity and never store the prompts you copy.
              </p>
              <p className="leading-relaxed">
                Avoid sharing names, dates, or other protected health information in any AI conversation. Always confirm care decisions with your clinicians.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 text-left lg:items-end">
              <nav className="flex flex-wrap gap-4 text-sm font-medium text-white">
                {legalLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-white/70">
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="text-xs text-white/60">
                © {currentYear} MediPrompt. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
