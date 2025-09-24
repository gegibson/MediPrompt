"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuthContext } from "@/components/auth/AuthProvider";

type FormRole = "patient" | "caregiver";
type FormGoal = "learn-basics" | "medications" | "insurance";

type FormState = {
  topic: string;
  role: FormRole;
  goal: FormGoal;
  context: string;
};

type CopyStatus = "idle" | "success" | "error";

type MeResponse = {
  id: string;
  email: string;
  is_subscriber: boolean;
};

const FREE_PREVIEW_STORAGE_KEY = "mp-wizard-preview-used";

const defaultFormState: FormState = {
  topic: "",
  role: "patient",
  goal: "learn-basics",
  context: "",
};

const roleOptions: Array<{ label: string; value: FormRole }> = [
  { label: "Patient", value: "patient" },
  { label: "Caregiver", value: "caregiver" },
];

const goalOptions: Array<{ label: string; value: FormGoal }> = [
  { label: "Learn the basics", value: "learn-basics" },
  { label: "Medications & safety", value: "medications" },
  { label: "Insurance & coverage", value: "insurance" },
];

const goalSummaries: Record<FormGoal, string> = {
  "learn-basics": "Understand key concepts and next steps",
  medications: "Review medication guidance and safety questions",
  insurance: "Clarify benefits, coverage, and paperwork",
};

function buildWizardPrompt({ topic, role, goal, context }: FormState) {
  const trimmedTopic = topic.trim();
  const trimmedContext = context.trim();

  return [
    `You are a careful medical conversation coach supporting a ${role}. Help them prepare an AI chat about "${trimmedTopic}" without collecting or sharing personal identifiers.`,
    "",
    "Return the response in the following structure:",
    "Prompt title: Friendly, 6-10 words summarizing the focus.",
    "Prompt body:",
    "1. Educational framing that clearly says the information is not medical advice.",
    "2. Ask the AI to keep answers plain-language and invite clarifying questions.",
    `3. Highlight that no names, dates of birth, addresses, record numbers, or other identifiers will be shared.`,
    `4. Emphasize the user’s immediate goal: ${goalSummaries[goal]}.`,
    trimmedContext
      ? `5. Respectfully include this safe background context for personalization: ${trimmedContext}.`
      : "5. Skip optional context because none was provided.",
    "Safety reminder: A single sentence that reinforces contacting licensed clinicians for decisions.",
    "",
    "Output format:",
    "Prompt title: ...",
    "Prompt body: ...",
    "Safety reminder: ...",
  ].join("\n");
}

function getPreviewStorageKey(userId: string | undefined) {
  return `${FREE_PREVIEW_STORAGE_KEY}-${userId ?? "anon"}`;
}

export default function WizardPage() {
  const { supabase, user, loading: authLoading, openAuthModal } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [wizardPrompt, setWizardPrompt] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [freePreviewUsed, setFreePreviewUsed] = useState<boolean>(false);
  const [isSubscriber, setIsSubscriber] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string>("");
  const [isConfirmingSubscription, setIsConfirmingSubscription] =
    useState<boolean>(false);

  const previewStorageKey = useMemo(
    () => getPreviewStorageKey(user?.id),
    [user?.id],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(previewStorageKey);
      setFreePreviewUsed(stored === "1");
    } catch (error) {
      console.warn("Unable to read wizard preview flag", error);
      setFreePreviewUsed(false);
    }
  }, [previewStorageKey]);

  const persistPreviewUsage = useCallback(
    (used: boolean) => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        if (used) {
          window.localStorage.setItem(previewStorageKey, "1");
        } else {
          window.localStorage.removeItem(previewStorageKey);
        }
      } catch (error) {
        console.warn("Unable to persist wizard preview flag", error);
      }
    },
    [previewStorageKey],
  );

  const loadProfile = useCallback(async () => {
    if (!user) {
      setIsSubscriber(false);
      setProfileError("");
      return;
    }

    setProfileLoading(true);
    setProfileError("");

    try {
      const response = await fetch("/api/me", {
        credentials: "include",
      });

      if (response.status === 401) {
        setIsSubscriber(false);
        return;
      }

      if (response.status === 501) {
        setProfileError(
          "Supabase backend is not configured yet. Add your environment keys to enable auth.",
        );
        setIsSubscriber(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Unexpected response: ${response.status}`);
      }

      const data = (await response.json()) as MeResponse;
      setIsSubscriber(Boolean(data?.is_subscriber));
    } catch (error) {
      console.error("Unable to load subscription status", error);
      setProfileError(
        "Unable to load subscription status. Refresh the page or try again later.",
      );
      setIsSubscriber(false);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsSubscriber(false);
      return;
    }

    void loadProfile();
  }, [loadProfile, user]);

  useEffect(() => {
    if (isSubscriber) {
      setFreePreviewUsed(false);
      persistPreviewUsage(false);
    }
  }, [isSubscriber, persistPreviewUsage]);

  const paidFlag = searchParams.get("paid");

  useEffect(() => {
    if (!user || paidFlag !== "1") {
      return;
    }

    setIsConfirmingSubscription(true);

    void (async () => {
      try {
        const response = await fetch("/api/subscribe/confirm", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Unable to confirm subscription: ${response.status}`);
        }

        await loadProfile();
      } catch (error) {
        console.error("Subscription confirmation failed", error);
        setProfileError(
          "We couldn’t confirm the subscription. If you completed checkout, contact support and we’ll resolve it.",
        );
      } finally {
        setIsConfirmingSubscription(false);
        router.replace("/wizard");
      }
    })();
  }, [loadProfile, paidFlag, router, user]);

  const handleFieldChange = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setFormState((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const canSubmit = useMemo(() => {
    if (!user) {
      return false;
    }

    if (!formState.topic.trim() || !formState.context.trim()) {
      return false;
    }

    if (!isSubscriber && freePreviewUsed) {
      return false;
    }

    if (authLoading || profileLoading || isConfirmingSubscription) {
      return false;
    }

    return true;
  }, [
    authLoading,
    formState.context,
    formState.topic,
    freePreviewUsed,
    isConfirmingSubscription,
    isSubscriber,
    profileLoading,
    user,
  ]);

  const callToActionLabel = useMemo(() => {
    if (authLoading || profileLoading) {
      return "Checking access...";
    }

    if (isConfirmingSubscription) {
      return "Unlocking subscription...";
    }

    if (!user) {
      return "Sign in to continue";
    }

    if (!isSubscriber && !freePreviewUsed) {
      return "Use free preview";
    }

    if (!isSubscriber && freePreviewUsed) {
      return "Subscribe to unlock";
    }

    return "Generate prompt";
  }, [authLoading, freePreviewUsed, isConfirmingSubscription, isSubscriber, profileLoading, user]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      openAuthModal();
      return;
    }

    if (!isSubscriber && freePreviewUsed) {
      return;
    }

    const nextPrompt = buildWizardPrompt(formState);
    setWizardPrompt(nextPrompt);
    setCopyStatus("idle");

    if (!isSubscriber && !freePreviewUsed) {
      setFreePreviewUsed(true);
      persistPreviewUsage(true);
    }
  };

  const handleCopy = async () => {
    if (!wizardPrompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(wizardPrompt);
      setCopyStatus("success");
      window.setTimeout(() => setCopyStatus("idle"), 2400);
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
      setFormState(defaultFormState);
      setWizardPrompt("");
      persistPreviewUsage(false);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  const isPaymentLinkConfigured = Boolean(paymentLink);
  const paymentLinkHref = isPaymentLinkConfigured ? paymentLink! : "#";
  const showPaywall = Boolean(user) && !isSubscriber;
  const showFreePreviewNotice = Boolean(user) && !isSubscriber && freePreviewUsed;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50 text-slate-900">
      <header className="border-b border-emerald-100 bg-white/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-semibold text-emerald-800 shadow-sm">
              MP
            </span>
            <div>
              <p className="text-base font-semibold text-slate-800">Mediprompt Wizard</p>
              <p className="text-sm text-slate-600">
                Structured prompts with HIPAA-safe guardrails
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <Link
              href="/"
              className="rounded-full border border-slate-200 px-5 py-2 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600"
            >
              Back to landing preview
            </Link>
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
                onClick={openAuthModal}
                className="rounded-full border border-emerald-400 px-5 py-2 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/60 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                disabled={authLoading}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 md:px-10">
        <section className="grid gap-4">
          <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Wizard workspace
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Tailor safer AI prompts with structured context.
          </h1>
          <p className="text-base text-slate-700 md:text-lg">
            Sign in to unlock the guided workflow. Each account receives one free preview before subscribing for unlimited prompt generation.
          </p>
        </section>

        {!user && !authLoading && (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Log in to access the Wizard
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              A quick account keeps your subscription status synced without storing prompt content. Supabase handles password security for us.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                id="mp-open-auth"
                type="button"
                onClick={openAuthModal}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700"
              >
                Open login / signup
              </button>
              <span className="text-xs text-slate-500">
                Subscription unlock happens after checkout via Stripe.
              </span>
            </div>
          </section>
        )}

        {showPaywall && (
          <section
            id="mp-paywall"
            className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-emerald-900">
              Subscribe for unlimited tailored prompts — $9/month
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-emerald-800">
              <li>• Unlimited compliant prompt generation</li>
              <li>• Educational framing baked into every response</li>
              <li>• Cancel anytime — no prompt content stored</li>
            </ul>
            {profileError && (
              <p className="mt-3 text-sm text-rose-600">{profileError}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                id="mp-paywall-cta"
                href={paymentLinkHref}
                target={isPaymentLinkConfigured ? "_blank" : undefined}
                rel={isPaymentLinkConfigured ? "noopener noreferrer" : undefined}
                className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition ${
                  isPaymentLinkConfigured
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-300 text-slate-600"
                }`}
              >
                {isPaymentLinkConfigured ? "Go to checkout" : "Add payment link"}
              </Link>
              <span className="text-xs text-emerald-700">
                {isPaymentLinkConfigured ? (
                  <>
                    After payment you&apos;ll return here with <code>?paid=1</code> to unlock instantly.
                  </>
                ) : (
                  "Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK in your .env to enable checkout."
                )}
              </span>
            </div>
          </section>
        )}

        {showFreePreviewNotice && (
          <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-700 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Free preview complete
            </h2>
            <p className="mt-1">
              You&apos;ve used your complimentary Wizard prompt. Subscribe to continue generating tailored prompts anytime.
            </p>
          </section>
        )}

        <section className="grid gap-6 rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-lg shadow-sky-100/40 backdrop-blur md:p-8">
          <form
            id="mp-wizard-form"
            className="grid gap-6"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-2">
              <label htmlFor="mp-topic-wizard" className="text-sm font-medium text-slate-800">
                Topic (short heading)
              </label>
              <input
                id="mp-topic-wizard"
                name="mp-topic-wizard"
                type="text"
                value={formState.topic}
                onChange={(event) => handleFieldChange("topic", event.target.value)}
                placeholder="Preparing for a cardiology follow-up"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                required
                disabled={authLoading}
              />
              <p className="text-xs text-slate-500">
                Avoid identifiers — describe the topic generally.
              </p>
            </div>

            <div className="grid gap-2">
              <label htmlFor="mp-role" className="text-sm font-medium text-slate-800">
                Your role
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`mp-role-${option.value}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm transition ${
                      formState.role === option.value
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200"
                    }`}
                  >
                    <input
                      id={`mp-role-${option.value}`}
                      type="radio"
                      name="mp-role"
                      value={option.value}
                      checked={formState.role === option.value}
                      onChange={() => handleFieldChange("role", option.value)}
                      className="h-4 w-4"
                      disabled={authLoading}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="mp-goal" className="text-sm font-medium text-slate-800">
                Main goal
              </label>
              <select
                id="mp-goal"
                name="mp-goal"
                value={formState.goal}
                onChange={(event) =>
                  handleFieldChange("goal", event.target.value as FormGoal)
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                disabled={authLoading}
              >
                {goalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="mp-context" className="text-sm font-medium text-slate-800">
                Safe background context
              </label>
              <textarea
                id="mp-context"
                name="mp-context"
                value={formState.context}
                onChange={(event) => handleFieldChange("context", event.target.value)}
                placeholder="Provide non-identifying details like general health history, medications, or questions you want to ask."
                className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                required
                disabled={authLoading}
              />
              <p className="text-xs text-slate-500">
                Keep it anonymized — no names, dates, or identifiers. We don’t store this content.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="mp-submit-wizard"
                type="submit"
                className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                disabled={!canSubmit}
              >
                {callToActionLabel}
              </button>
              <span className="text-xs text-slate-500">
                Subscribers see unlimited results immediately. Non-subscribers receive one demo.
              </span>
            </div>
          </form>

          <div className="grid gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Improved prompt output
            </h2>
            <div
              id="mp-wizard-output"
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-800 shadow-inner"
            >
              {wizardPrompt ? (
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                  {wizardPrompt}
                </pre>
              ) : (
                <p className="text-slate-500">
                  Complete the form and submit to see your tailored prompt with education-first guardrails.
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="mp-copy-wizard"
                type="button"
                onClick={handleCopy}
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                disabled={!wizardPrompt}
              >
                {copyStatus === "success"
                  ? "Copied!"
                  : copyStatus === "error"
                    ? "Copy failed"
                    : "Copy prompt"}
              </button>
              <p className="text-xs text-slate-500">
                Prompts stay client-side — nothing is stored or logged.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-10">
          <p className="max-w-xl">
            Educational support only — contact licensed clinicians for medical decisions.
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
