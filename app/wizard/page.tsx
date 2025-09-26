"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { trackEvent } from "@/lib/analytics/track";
import { detectPhi, buildWarningMessage } from "@/lib/safety/phiGuard";

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
const CHECKOUT_SESSION_STORAGE_KEY = "mp-last-checkout-session";

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

function WizardPageInner() {
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
  const [topicPhiWarning, setTopicPhiWarning] = useState<string>("");
  const [contextPhiWarning, setContextPhiWarning] = useState<string>("");
  const [isConfirmingSubscription, setIsConfirmingSubscription] =
    useState<boolean>(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState<boolean>(false);
  const paywallTrackedRef = useRef(false);

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

  const isLoggedIn = Boolean(user);

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
        trackEvent("profile_load_unauthenticated");
        return;
      }

      if (response.status === 501) {
        setProfileError(
          "Supabase backend is not configured yet. Add your environment keys to enable auth.",
        );
        setIsSubscriber(false);
        trackEvent("profile_load_not_configured");
        return;
      }

      if (!response.ok) {
        throw new Error(`Unexpected response: ${response.status}`);
      }

      const data = (await response.json()) as MeResponse;
      const subscriber = Boolean(data?.is_subscriber);
      setIsSubscriber(subscriber);
      trackEvent("profile_loaded", {
        is_subscriber: subscriber,
      });
    } catch (error) {
      console.error("Unable to load subscription status", error);
      setProfileError(
        "Unable to load subscription status. Refresh the page or try again later.",
      );
      setIsSubscriber(false);
      trackEvent("profile_load_error");
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

  const checkoutStatus = searchParams.get("checkout");
  const sessionIdFromParams = searchParams.get("session_id");

  useEffect(() => {
    if (!user || checkoutStatus !== "success") {
      return;
    }

    let sessionId = sessionIdFromParams?.trim() ?? "";

    if (!sessionId || sessionId.includes("CHECKOUT_SESSION_ID")) {
      if (typeof window !== "undefined") {
        const storedId = window.sessionStorage.getItem(
          CHECKOUT_SESSION_STORAGE_KEY,
        );

        if (storedId && !storedId.includes("CHECKOUT_SESSION_ID")) {
          sessionId = storedId;
        }
      }
    }

    if (typeof window !== "undefined") {
      console.log("[Wizard] confirming subscription with sessionId", sessionId);
      // expose for quick inspection in devtools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mpLastCheckoutSession = sessionId;
    }

    if (!sessionId) {
      setProfileError(
        "We completed checkout but could not confirm the subscription. Refresh the page or contact support.",
      );
      trackEvent("subscription_confirm_missing_session");
      return;
    }

    setIsConfirmingSubscription(true);
    trackEvent("subscription_confirm_start");

    void (async () => {
      try {
        const response = await fetch("/api/subscribe/confirm", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        if (response.status === 501) {
          setProfileError(
            "Stripe backend is not configured yet. Add your Stripe keys to enable checkout.",
          );
          trackEvent("subscription_confirm_not_configured");
          return;
        }

        if (!response.ok) {
          throw new Error(`Unable to confirm subscription: ${response.status}`);
        }

        await loadProfile();
        trackEvent("subscription_confirm_success");
      } catch (error) {
        console.error("Subscription confirmation failed", error);
        setProfileError(
          "We couldn't confirm the subscription. If you completed checkout, contact support and we'll resolve it.",
        );
        trackEvent("subscription_confirm_error", {
          error_type: error instanceof Error ? error.name : "unknown",
        });
      } finally {
        setIsConfirmingSubscription(false);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
        }
        router.replace("/wizard");
      }
    })();
  }, [checkoutStatus, loadProfile, router, sessionIdFromParams, user]);

  useEffect(() => {
    if (checkoutStatus !== "cancelled") {
      return;
    }

    trackEvent("subscription_checkout_cancelled");
    setProfileError("Checkout was cancelled. You can retry when you're ready.");
    router.replace("/wizard");
  }, [checkoutStatus, router]);

  useEffect(() => {
    if (!user || checkoutStatus !== "success" || sessionIdFromParams) {
      return;
    }

    trackEvent("subscription_confirm_missing_session");
    setProfileError(
      "We couldn't verify the checkout session. If you were charged, contact support and we'll resolve it.",
    );
    router.replace("/wizard");
  }, [checkoutStatus, router, sessionIdFromParams, user]);

  const handleFieldChange = useCallback(<Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setFormState((previous) => ({ ...previous, [key]: value }));

    if (key === "topic") {
      const scan = detectPhi(String(value));
      setTopicPhiWarning(scan.flagged ? buildWarningMessage(scan) : "");
    }
    if (key === "context") {
      const scan = detectPhi(String(value));
      setContextPhiWarning(scan.flagged ? buildWarningMessage(scan) : "");
    }
  }, []);

  const canSubmit = useMemo(() => {
    if (!formState.topic.trim() || !formState.context.trim()) {
      return false;
    }

    if (
      authLoading ||
      profileLoading ||
      isConfirmingSubscription ||
      isCreatingCheckout
    ) {
      return false;
    }

    if (isSubscriber) {
      return true;
    }

    if (!freePreviewUsed) {
      return true;
    }

    return !isLoggedIn;
  }, [
    authLoading,
    formState.context,
    formState.topic,
    freePreviewUsed,
    isLoggedIn,
    isCreatingCheckout,
    isConfirmingSubscription,
    isSubscriber,
    profileLoading,
  ]);

  const callToActionLabel = useMemo(() => {
    if (authLoading || profileLoading) {
      return "Checking access...";
    }

    if (isConfirmingSubscription) {
      return "Unlocking subscription...";
    }

    if (isCreatingCheckout) {
      return "Opening Stripe...";
    }

    if (!isLoggedIn && !freePreviewUsed) {
      return "Try a free prompt";
    }

    if (!isLoggedIn && freePreviewUsed) {
      return "Sign in to continue";
    }

    if (!isSubscriber && !freePreviewUsed) {
      return "Use free preview";
    }

    if (!isSubscriber && freePreviewUsed) {
      return "Subscribe to unlock";
    }

    return "Generate prompt";
  }, [
    authLoading,
    freePreviewUsed,
    isCreatingCheckout,
    isConfirmingSubscription,
    isSubscriber,
    profileLoading,
    isLoggedIn,
  ]);

  const triggerAuthModal = useCallback(
    (source: string) => {
      trackEvent("auth_modal_open", { source });
      openAuthModal();
    },
    [openAuthModal],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSubscriber && freePreviewUsed) {
      if (!isLoggedIn) {
        trackEvent("wizard_prompt_blocked", { reason: "anon-login" });
        triggerAuthModal("wizard-submit");
      } else {
        trackEvent("wizard_prompt_blocked", { reason: "paywall" });
      }
      return;
    }

    const topicScan = detectPhi(formState.topic);
    const contextScan = detectPhi(formState.context);
    setTopicPhiWarning(topicScan.flagged ? buildWarningMessage(topicScan) : "");
    setContextPhiWarning(contextScan.flagged ? buildWarningMessage(contextScan) : "");
    if (topicScan.flagged || contextScan.flagged) {
      trackEvent("wizard_input_flagged", {
        source: "wizard",
        topic_names: topicScan.counts.name,
        topic_dates: topicScan.counts.date,
        topic_long_numbers: topicScan.counts.long_number,
        context_names: contextScan.counts.name,
        context_dates: contextScan.counts.date,
        context_long_numbers: contextScan.counts.long_number,
        total: topicScan.counts.total + contextScan.counts.total,
      });
    }

    const nextPrompt = buildWizardPrompt(formState);
    setWizardPrompt(nextPrompt);
    setCopyStatus("idle");

    if (!isSubscriber && !freePreviewUsed) {
      setFreePreviewUsed(true);
      persistPreviewUsage(true);
      trackEvent("wizard_free_preview_consumed");
    }

    trackEvent("wizard_prompt_generated", {
      is_subscriber: isSubscriber,
      role: formState.role,
      goal: formState.goal,
      context_length: formState.context.trim().length,
    });
  };

  const handleCopy = async () => {
    if (!wizardPrompt) {
      return;
    }

    try {
      await navigator.clipboard.writeText(wizardPrompt);
      setCopyStatus("success");
      window.setTimeout(() => setCopyStatus("idle"), 2400);
      trackEvent("wizard_prompt_copied", {
        is_subscriber: isSubscriber,
      });
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
      trackEvent("auth_signed_out", { source: "wizard" });
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleStartCheckout = async () => {
    if (isCreatingCheckout) {
      return;
    }

    if (!user) {
      triggerAuthModal("wizard-paywall");
      return;
    }

    setIsCreatingCheckout(true);
    setProfileError("");
    trackEvent("wizard_checkout_session_start");

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
      });

      if (response.status === 501) {
        setProfileError(
          "Stripe is not configured yet. Add your Stripe keys to enable checkout.",
        );
        trackEvent("wizard_checkout_session_not_configured");
        return;
      }

      if (!response.ok) {
        let serverMessage = "";

        try {
          const errorData = (await response.json()) as {
            error?: string;
            hint?: string;
          };
          serverMessage = errorData.hint || errorData.error || "";
        } catch (parseError) {
          console.warn("Unable to parse checkout session error", parseError);
        }

        if (serverMessage) {
          setProfileError(serverMessage);
        }

        throw new Error(`Unexpected response: ${response.status}`);
      }

      const data = (await response.json()) as {
        url?: string | null;
        sessionId?: string | null;
      };

      if (!data?.url) {
        throw new Error("Missing checkout URL");
      }

      if (typeof window !== "undefined") {
        if (data.sessionId) {
          console.log("[Wizard] storing checkout sessionId", data.sessionId);
          window.sessionStorage.setItem(
            CHECKOUT_SESSION_STORAGE_KEY,
            data.sessionId,
          );
        } else {
          window.sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
        }
      }

      trackEvent("wizard_checkout_session_ready");
      window.location.href = data.url;
    } catch (error) {
      console.error("Unable to start Stripe checkout", error);
      setProfileError(
        "We couldn't open Stripe checkout. Refresh and try again or contact support.",
      );
      trackEvent("wizard_checkout_session_error", {
        error_type: error instanceof Error ? error.name : "unknown",
      });
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const showPaywall = isLoggedIn && !isSubscriber;
  const showFreePreviewNotice = !isSubscriber && freePreviewUsed;

  useEffect(() => {
    if (showPaywall && !paywallTrackedRef.current) {
      trackEvent("wizard_paywall_viewed", {
        free_preview_used: freePreviewUsed,
      });
      paywallTrackedRef.current = true;
    }
  }, [freePreviewUsed, showPaywall]);

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
              <div className="mt-2">
                <span
                  className={
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                    (isSubscriber
                      ? "bg-emerald-100 text-emerald-700"
                      : isLoggedIn
                        ? "bg-sky-100 text-sky-700"
                        : "bg-slate-100 text-slate-700")
                  }
                  title={isSubscriber ? "Active subscriber" : isLoggedIn ? "Logged in (free preview)" : "Anonymous (free preview)"}
                >
                  {isSubscriber ? "Plan: Unlimited" : isLoggedIn ? "Plan: Free (account)" : "Plan: Free (anon)"}
                </span>
              </div>
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
                onClick={() => triggerAuthModal("wizard-header")}
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
            Generate one guided prompt without logging in. Create a free account afterward to sync your subscription and unlock unlimited prompt generation.
          </p>
        </section>

        {!user && !authLoading && (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Ready for more than one prompt?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Try your complimentary preview first. When you&apos;re ready for unlimited prompts, create a free account so we can remember your subscription without storing any prompt content.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                id="mp-open-auth"
                type="button"
                onClick={() => triggerAuthModal("wizard-gate")}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700"
              >
                Log in or sign up
              </button>
              <span className="text-xs text-slate-500">
                Stripe checkout is only available once you have an account.
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
              <button
                id="mp-paywall-cta"
                type="button"
                onClick={() => {
                  trackEvent("wizard_paywall_cta_click");
                  void handleStartCheckout();
                }}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={isCreatingCheckout || isConfirmingSubscription}
              >
                {isCreatingCheckout ? "Opening Stripe..." : "Go to checkout"}
              </button>
              <span className="text-xs text-emerald-700">
                After payment you&apos;ll return here automatically and unlock as soon as the subscription confirms.
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
              {isLoggedIn
                ? "You've used your complimentary Wizard prompt. Subscribe to continue generating tailored prompts anytime."
                : "You've used your complimentary Wizard prompt. Sign in to create an account and subscribe for unlimited prompt generation."}
            </p>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => triggerAuthModal("wizard-free-preview")}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700"
              >
                Sign in to continue
              </button>
            )}
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
              {topicPhiWarning ? (
                <p className="text-xs text-rose-600">{topicPhiWarning}</p>
              ) : (
                <p className="text-xs text-slate-500">
                  Avoid identifiers — describe the topic generally.
                </p>
              )}
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
              {contextPhiWarning ? (
                <p className="text-xs text-rose-600">{contextPhiWarning}</p>
              ) : (
                <p className="text-xs text-slate-500">
                  Keep it anonymized — no names, dates, or identifiers. We don’t store this content.
                </p>
              )}
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

export default function WizardPage() {
  return (
    <Suspense fallback={null}>
      <WizardPageInner />
    </Suspense>
  );
}
