"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { trackEvent } from "@/lib/analytics/track";

const PREVIEW_STORAGE_KEY = "mp-landing-preview-count";
const PREVIEW_LIMIT = 2;

const friendlyExamples = [
  "Discussing new blood pressure concerns",
  "Preparing questions about a child’s asthma",
  "Clarifying insurance coverage terms",
] as const;

function buildPreviewPrompt(topic: string) {
  const sanitizedTopic = topic.trim();

  return [
    `You are a cautious medical conversation coach helping a patient or caregiver prepare an AI chat about "${sanitizedTopic}". Provide guidance that remains educational, avoids diagnosing, and protects personal information.`,
    "",
    "Return the response in the following structure:",
    "Prompt title: (friendly, 6-8 words)",
    "Prompt body: A concise, well-structured prompt that:",
    "- Frames the chat as educational only and asks the AI to remind the user to contact a licensed clinician for decisions.",
    "- Requests answers in plain language and invites clarification questions.",
    "- Emphasizes that no names, birth dates, addresses, record numbers, or other identifiers will be shared.",
    "- Encourages next best steps or key follow-up questions to discuss with a professional.",
    "Safety reminder: One sentence reiterating that the information is not medical advice.",
  ].join("\n");
}

export default function LandingPage() {
  const [topic, setTopic] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [placeholderExample] = useState(
    () => friendlyExamples[Math.floor(Math.random() * friendlyExamples.length)],
  );
  const { user, supabase, openAuthModal, loading } = useAuthContext();

  const handleAuthModalOpen = () => {
    trackEvent("auth_modal_open", { source: "landing-nav" });
    openAuthModal();
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = Number.parseInt(
        window.localStorage.getItem(PREVIEW_STORAGE_KEY) ?? "0",
        10,
      );
      if (!Number.isNaN(stored)) {
        setPreviewCount(stored);
      } else {
        setPreviewCount(0);
      }
    } catch (error) {
      console.error("Unable to read preview count", error);
      setPreviewCount(0);
    }
  }, []);

  const canPreview = useMemo(() => {
    const count = previewCount ?? 0;
    return count < PREVIEW_LIMIT;
  }, [previewCount]);

  const remainingPreviews = useMemo(() => {
    const count = previewCount ?? 0;
    return Math.max(PREVIEW_LIMIT - count, 0);
  }, [previewCount]);

  const handleGenerate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canPreview || !topic.trim()) {
      if (!canPreview) {
        trackEvent("landing_preview_limit_hit");
      }
      return;
    }

    const nextPrompt = buildPreviewPrompt(topic);
    setPreviewPrompt(nextPrompt);
    setCopyStatus("idle");

    const nextCount = (previewCount ?? 0) + 1;
    setPreviewCount(nextCount);

    try {
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, String(nextCount));
    } catch (error) {
      console.error("Unable to persist preview count", error);
    }

    trackEvent("landing_preview_generated", {
      previews_used: nextCount,
      previews_remaining: Math.max(PREVIEW_LIMIT - nextCount, 0),
      topic_length: topic.trim().length,
    });
  };

  const handleCopy = async () => {
    if (!previewPrompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(previewPrompt);
      setCopyStatus("success");
      window.setTimeout(() => setCopyStatus("idle"), 2400);
      trackEvent("landing_prompt_copied");
    } catch (error) {
      console.error("Copy failed", error);
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 3200);
    }
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
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-10 pt-12 md:px-10">
        <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-semibold text-emerald-800 shadow-sm">
              MP
            </span>
            <div>
              <p className="text-base font-semibold text-slate-800">Mediprompt</p>
              <p className="text-sm text-slate-600">
                Safer AI prompts for patients & caregivers
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-300 px-5 py-2 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAuthModalOpen}
                className="rounded-full border border-emerald-400 px-5 py-2 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/60 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                disabled={loading}
              >
                Sign in
              </button>
            )}
            <Link
              href="/wizard"
              className="rounded-full border border-emerald-400 px-5 py-2 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/60"
            >
              Skip to Wizard
            </Link>
            <Link
              href="/wizard"
              className="rounded-full bg-emerald-600 px-5 py-2 text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Use Wizard
            </Link>
          </div>
        </nav>

        <div className="grid gap-4 md:max-w-3xl">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Educational, not medical advice
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Craft clearer, safer AI health prompts in seconds.
          </h1>
          <p className="text-lg text-slate-700 md:text-xl">
            Mediprompt helps patients and caregivers frame questions responsibly. Try the public chatbox below, then step into the Wizard for unlimited tailored prompts.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-16 md:px-10">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] lg:items-start">
          <div id="mp-landing-preview-card" className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-lg shadow-sky-100/50 backdrop-blur md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Preview the prompt improver
                </h2>
                <p className="text-sm text-slate-600">
                  You have {PREVIEW_LIMIT} quick demos per browser. We never store what you type.
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                {PREVIEW_LIMIT - remainingPreviews} / {PREVIEW_LIMIT} used
              </span>
            </div>

            {!canPreview && (
              <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Free preview complete</p>
                <p>
                  You&apos;ve reached your public demo limit. Head to the Wizard to keep generating compliant prompts anytime.
                </p>
              </div>
            )}

            <form id="mp-landing-preview-form" className="grid gap-5" onSubmit={handleGenerate}>
              <div className="grid gap-2">
                <label htmlFor="mp-topic-landing" className="text-sm font-medium text-slate-800">
                  What health topic are you exploring?
                </label>
                <input
                  id="mp-topic-landing"
                  name="mp-topic-landing"
                  type="text"
                  placeholder={`E.g. ${placeholderExample}`}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  disabled={!canPreview}
                  required
                />
                <p className="text-xs text-slate-500">
                  Use generic terms only — no names, ID numbers, addresses, or dates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  disabled={!canPreview || !topic.trim()}
                >
                  Improve my prompt
                </button>
                <span className="text-xs text-slate-500">
                  Remaining previews today: {remainingPreviews}
                </span>
              </div>
            </form>

            <div className="mt-6 grid gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Improved prompt
              </h3>
              <div id="mp-landing-output" className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-800 shadow-inner">
                {previewPrompt ? (
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                    {previewPrompt}
                  </pre>
                ) : (
                  <p className="text-slate-500">
                    Generate a sample above to see how Mediprompt reframes questions for safer AI chats.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  id="mp-landing-copy-button"
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  disabled={!previewPrompt}
                >
                  {copyStatus === "success"
                    ? "Copied!"
                    : copyStatus === "error"
                      ? "Copy failed"
                      : "Copy prompt"}
                </button>
                <p className="text-xs text-slate-500">
                  This stays on your device — nothing is sent to our servers.
                </p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6 text-sm text-slate-700">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold text-emerald-900">
                Why the Wizard unlocks more
              </h3>
              <ul className="grid gap-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow">1</span>
                  <p>
                    Guided form captures context like role, goals, and safe background details for richer prompts.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow">2</span>
                  <p>
                    Subscribers get unlimited prompts, reminders for next steps, and compliance cues across every response.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow">3</span>
                  <p>
                    Stripe-powered checkout — cancel anytime. We never store payment or prompt content.
                  </p>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h3 className="mb-2 text-base font-semibold text-slate-900">
                Data discipline at every step
              </h3>
              <ul className="grid gap-2">
                <li>• No PHI collected, logged, or stored.</li>
                <li>• Local two-preview cap — enforced only in your browser.</li>
                <li>• Educational framing across the app and emails.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-sky-50/80 p-6 shadow-sm">
              <h3 className="mb-2 text-base font-semibold text-slate-900">
                Ready for tailored prompts?
              </h3>
              <p className="mb-4 text-sm">
                Jump into the Wizard to unlock structured inputs, personalized tone, and unlimited prompt generation for $9/month.
              </p>
              <Link
                href="/wizard"
                className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
              >
                Open the Wizard
              </Link>
            </div>
          </aside>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-10">
          <p className="max-w-xl">
            Mediprompt is educational only and does not provide medical advice, diagnoses, or treatment. Always consult a licensed clinician for personal care decisions.
          </p>
          <div className="flex flex-wrap gap-4 font-medium text-slate-600">
            <Link href="/privacy" className="hover:text-emerald-600">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-emerald-600">
              Terms
            </Link>
            <Link href="/disclaimer" className="hover:text-emerald-600">
              Disclaimer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
