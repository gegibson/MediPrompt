"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PromptActionPanel } from "@/components/library/PromptActionPanel";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type {
  LibraryCategory,
  PromptBody,
  PromptIndexItem,
} from "@/lib/library/types";
import {
  consumeStoredCheckoutSessionId,
  consumeStoredReturnPath,
  initiateSubscriptionCheckout,
  peekStoredCheckoutSessionId,
} from "@/lib/subscription/checkout";
import { trackEvent } from "@/lib/analytics/track";

const SUBSCRIPTION_CACHE = new Map<string, { isSubscriber: boolean; timestamp: number }>();
const SUBSCRIPTION_CACHE_TTL = 1000 * 60 * 5;

const SUBSCRIPTION_BENEFITS = [
  "Access all 50+ healthcare prompts",
  "New prompts added monthly",
  "Cancel anytime",
];

const LOCK_ICON = "\uD83D\uDD12";


export type RelatedPrompt = PromptIndexItem & {
  category?: LibraryCategory | null;
};

export type PromptDetailClientProps = {
  prompt: PromptBody;
  category: LibraryCategory | null;
  related: RelatedPrompt[];
  shareUrl: string;
  jsonLd: Record<string, unknown>;
  llmDestinations: {
    label: string;
    href: string;
    background: string;
  }[];
};

type SubscriptionState = {
  status: "idle" | "loading" | "ready" | "error";
  isSubscriber: boolean;
  error: string;
};

type BannerVariant = "hidden" | "visible" | "dismissed";

type Alert = {
  kind: "success" | "error" | "info";
  message: string;
};

export function PromptDetailClient({
  prompt,
  category,
  related,
  shareUrl,
  jsonLd,
  llmDestinations,
}: PromptDetailClientProps) {
  const { user, loading: authLoading, openAuthModal } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    status: "idle",
    isSubscriber: false,
    error: "",
  });
  const [bannerState, setBannerState] = useState<BannerVariant>("hidden");
  const [ctaError, setCtaError] = useState<string>("");
  const [ctaPending, setCtaPending] = useState<boolean>(false);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<"idle" | "loading">("idle");

  const cacheKey = user?.id ?? "anonymous";
  const promptViewTrackedRef = useRef(false);
  const lockedViewTrackedRef = useRef(false);
  const checkoutHandledRef = useRef(false);
  const successHandledRef = useRef(false);


  const hasAccess = prompt.isFree || subscriptionState.isSubscriber;
  const isCheckingSubscription =
    !prompt.isFree && (authLoading || subscriptionState.status === "loading" || confirmationStatus === "loading");
  const shouldShowLockedState = !prompt.isFree && !hasAccess;

  const previewExcerpt = useMemo(() => {
    if (prompt.isFree) {
      return prompt.body;
    }
    const lines = prompt.body.split("\n").filter((line) => line.trim().length > 0);
    return lines.slice(0, 3).join("\n");
  }, [prompt.body, prompt.isFree]);

  const resolvedUsageTips = useMemo(() => {
    return prompt.usageTips && prompt.usageTips.length > 0
      ? prompt.usageTips
      : [
          "Keep names, dates, and policy numbers out of the prompt.",
          "Review AI-generated guidance with your clinician before acting.",
          "Highlight the questions that matter most so your visit stays focused.",
          "Call emergency services for urgent symptoms instead of relying on AI.",
        ];
  }, [prompt.usageTips]);

  const handleBannerDismiss = useCallback(() => {
    setBannerState("dismissed");
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("prompt-premium-banner-dismissed", "true");
    }
  }, []);

  const loadSubscriptionState = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (prompt.isFree) {
        setSubscriptionState({ status: "ready", isSubscriber: false, error: "" });
        SUBSCRIPTION_CACHE.delete(cacheKey);
        return;
      }

      if (!user) {
        setSubscriptionState({ status: "ready", isSubscriber: false, error: "" });
        return;
      }

      if (!force) {
        const cached = SUBSCRIPTION_CACHE.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < SUBSCRIPTION_CACHE_TTL) {
          setSubscriptionState({ status: "ready", isSubscriber: cached.isSubscriber, error: "" });
          return;
        }
      }

      setSubscriptionState({ status: "loading", isSubscriber: false, error: "" });

      try {
        const response = await fetch("/api/me", {
          credentials: "include",
        });

        if (response.status === 401) {
          SUBSCRIPTION_CACHE.set(cacheKey, { isSubscriber: false, timestamp: Date.now() });
          setSubscriptionState({ status: "ready", isSubscriber: false, error: "" });
          return;
        }

        if (response.status === 501) {
          const errorMessage = "Subscription backend is not configured yet. Contact support to enable upgrades.";
          setSubscriptionState({ status: "error", isSubscriber: false, error: errorMessage });
          return;
        }

        if (!response.ok) {
          throw new Error(`Unexpected response: ${response.status}`);
        }

        const data = (await response.json()) as { is_subscriber?: boolean };
        const isSubscriber = Boolean(data?.is_subscriber);
        SUBSCRIPTION_CACHE.set(cacheKey, { isSubscriber, timestamp: Date.now() });
        setSubscriptionState({ status: "ready", isSubscriber, error: "" });
      } catch (error) {
        console.error("Unable to resolve subscription status", error);
        setSubscriptionState({
          status: "error",
          isSubscriber: false,
          error: "We couldn't confirm your subscription. Try again or refresh the page.",
        });
      }
    },
    [cacheKey, prompt.isFree, user],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void loadSubscriptionState();
  }, [authLoading, loadSubscriptionState]);

  useEffect(() => {
    if (prompt.isFree || !shouldShowLockedState) {
      setBannerState("hidden");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.sessionStorage.getItem("prompt-premium-banner-dismissed");
    setBannerState(dismissed ? "dismissed" : "visible");
  }, [prompt.isFree, shouldShowLockedState]);

  useEffect(() => {
    if (promptViewTrackedRef.current) {
      return;
    }

    if (!prompt.isFree && (authLoading || subscriptionState.status === "loading")) {
      return;
    }

    trackEvent("prompt_view", {
      prompt_id: prompt.id,
      is_free: prompt.isFree,
      is_logged_in: Boolean(user),
      is_subscriber: hasAccess,
    });
    promptViewTrackedRef.current = true;
  }, [authLoading, hasAccess, prompt.id, prompt.isFree, subscriptionState.status, user]);

  useEffect(() => {
    if (!shouldShowLockedState) {
      return;
    }

    if (subscriptionState.status === "loading" || authLoading) {
      return;
    }

    if (lockedViewTrackedRef.current) {
      return;
    }

    trackEvent("prompt_locked_view", {
      prompt_id: prompt.id,
      is_free: prompt.isFree,
      is_logged_in: Boolean(user),
    });
    lockedViewTrackedRef.current = true;
  }, [authLoading, shouldShowLockedState, subscriptionState.status, prompt.id, prompt.isFree, user]);

  useEffect(() => {
    if (hasAccess) {
      setCtaError("");
    }
  }, [hasAccess]);

  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status !== "cancelled") {
      return;
    }

    if (checkoutHandledRef.current) {
      return;
    }

    checkoutHandledRef.current = true;
    trackEvent("subscription_checkout_cancelled", {
      location: "prompt",
      prompt_id: prompt.id,
    });
    setAlert({
      kind: "info",
      message: "Checkout was cancelled. You can subscribe whenever you're ready.",
    });
    consumeStoredCheckoutSessionId();
    consumeStoredReturnPath();
    router.replace(pathname);
  }, [pathname, router, searchParams, prompt.id]);

  useEffect(() => {
    const status = searchParams.get("checkout");
    if (status !== "success") {
      return;
    }

    if (authLoading) {
      return;
    }

    if (successHandledRef.current) {
      return;
    }

    successHandledRef.current = true;

    if (!user) {
      trackEvent("subscription_confirm_missing_user", {
        location: "prompt",
        prompt_id: prompt.id,
      });
      setAlert({
        kind: "error",
        message: "Sign in to finish activating your subscription.",
      });
      router.replace(pathname);
      return;
    }

    let sessionId = searchParams.get("session_id") ?? "";
    if (!sessionId || sessionId.includes("CHECKOUT_SESSION_ID")) {
      const storedId = peekStoredCheckoutSessionId();
      if (storedId && !storedId.includes("CHECKOUT_SESSION_ID")) {
        sessionId = storedId;
      }
    }

    if (!sessionId) {
      trackEvent("subscription_confirm_missing_session", {
        location: "prompt",
        prompt_id: prompt.id,
      });
      setAlert({
        kind: "error",
        message: "We completed checkout but could not confirm the subscription. Refresh the page or contact support.",
      });
      consumeStoredCheckoutSessionId();
      consumeStoredReturnPath();
      router.replace(pathname);
      return;
    }

    setConfirmationStatus("loading");
    trackEvent("subscription_confirm_start", {
      location: "prompt",
      prompt_id: prompt.id,
    });

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
          setAlert({
            kind: "error",
            message: "Stripe backend is not configured yet. Add your Stripe keys to enable checkout.",
          });
          trackEvent("subscription_confirm_not_configured", {
            location: "prompt",
            prompt_id: prompt.id,
          });
          return;
        }

        if (!response.ok) {
          throw new Error(`Unable to confirm subscription: ${response.status}`);
        }

        await loadSubscriptionState({ force: true });
        setAlert({
          kind: "success",
          message: "Subscription activated! Enjoy full access to every prompt.",
        });
        setBannerState("dismissed");
        trackEvent("subscription_confirm_success", {
          location: "prompt",
          prompt_id: prompt.id,
        });
      } catch (error) {
        console.error("Subscription confirmation failed", error);
        setAlert({
          kind: "error",
          message: "We couldn't confirm the subscription. If you completed checkout, contact support and we'll resolve it.",
        });
        trackEvent("subscription_confirm_error", {
          location: "prompt",
          prompt_id: prompt.id,
          error_type: error instanceof Error ? error.name : "unknown",
        });
      } finally {
        setConfirmationStatus("idle");
        consumeStoredCheckoutSessionId();
        consumeStoredReturnPath();
        router.replace(pathname);
      }
    })();
  }, [authLoading, loadSubscriptionState, pathname, prompt.id, router, searchParams, user]);

  const handleRetrySubscriptionCheck = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("prompt-premium-banner-dismissed");
    }
    setSubscriptionState((previous) => ({
      ...previous,
      status: "loading",
      error: "",
    }));
    void loadSubscriptionState({ force: true });
  }, [loadSubscriptionState]);

  const handleSubscribeClick = useCallback(
    async (source: "header" | "overlay" | "banner") => {
      if (ctaPending) {
        return;
      }

      setCtaError("");
      setCtaPending(true);

      trackEvent("subscription_cta_click", {
        prompt_id: prompt.id,
        source,
        is_free: prompt.isFree,
        is_logged_in: Boolean(user),
      });

      const result = await initiateSubscriptionCheckout({
        hasAccess,
        isLoggedIn: Boolean(user),
        openAuthModal,
        returnPath: `/library/${prompt.id}`,
        source,
      });

      setCtaPending(false);

      if (result.status === "error") {
        setCtaError(result.message);
        trackEvent("subscription_checkout_session_error", {
          prompt_id: prompt.id,
          source,
        });
        return;
      }

      if (result.status === "already-active") {
        setAlert({
          kind: "info",
          message: "You already have full access. Visit your profile to manage billing.",
        });
        setBannerState("dismissed");
      }
    },
    [ctaPending, hasAccess, openAuthModal, prompt.id, prompt.isFree, user],
  );

  const headerBadge = prompt.isFree ? (
    <span className="inline-flex rounded-full bg-[var(--color-secondary-background)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-accent)]">
      Free
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-[var(--color-secondary-background)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
      Premium
    </span>
  );

  const bannerVisible = bannerState === "visible";
  const overlayButtonLabel = ctaPending ? "Starting checkout…" : "Subscribe for $6/month";
  const examplePreview = useMemo(() => {
    const lines = prompt.body.split("\n").filter((line) => line.trim().length > 0);
    return lines.slice(0, 3).map((line) => line.replace(/^\d+\.\s*/, "")).filter(Boolean);
  }, [prompt.body]);
  const alertTone = alert
    ? alert.kind === "success"
      ? {
          icon: "✔",
          container: "bg-[#e7f1ff] text-[var(--color-text-primary)] border border-[#c5dcff]",
          button: "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]",
        }
      : alert.kind === "error"
        ? {
            icon: "!",
            container: "bg-rose-50 text-rose-700 border border-rose-200",
            button: "text-rose-700 hover:text-rose-900",
          }
        : {
            icon: "ℹ",
            container: "bg-[var(--color-secondary-background)] text-[var(--color-text-primary)] border border-[var(--color-secondary-background)]",
            button: "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]",
          }
    : null;

  return (
    <div className="bg-[var(--color-secondary-background)] pb-16">
      <header className="relative bg-[var(--color-primary-background)] text-[var(--color-text-primary)] shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-12 sm:gap-8 sm:px-6 lg:px-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            suppressHydrationWarning
          />
          <nav className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-[var(--color-text-secondary)]">
            <Link href="/library" className="transition hover:text-[var(--color-text-primary)]">
              Healthcare Library
            </Link>
            <span aria-hidden="true">/</span>
            {category ? (
              <Link
                href={`/library?category=${category.id}`}
                className="transition hover:text-[var(--color-text-primary)]"
              >
                {category.name}
              </Link>
            ) : (
              <span>Prompt</span>
            )}
            <span aria-hidden="true">/</span>
            <span className="text-[var(--color-text-primary)]">{prompt.title}</span>
          </nav>

          <div className="space-y-5">
            <div className="inline-flex flex-wrap items-center gap-3">
              {category ? (
                <span className="inline-flex rounded-full bg-[var(--color-secondary-background)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
                  {category.name}
                </span>
              ) : null}
              {headerBadge}
            </div>
            <h1 className="text-[32px] font-bold leading-tight text-[var(--color-text-primary)] sm:text-[42px]">
              {prompt.title}
            </h1>
            <p className="max-w-2xl text-base text-[var(--color-text-secondary)]">
              {prompt.shortDescription}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {hasAccess ? (
                <PromptActionPanel
                  promptText={prompt.body}
                  destinations={llmDestinations}
                  promptId={prompt.id}
                  categoryId={prompt.categoryId}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubscribeClick("header")}
                  disabled={ctaPending}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-accent)] transition hover:bg-[#e7f1ff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {LOCK_ICON} Subscribe to Copy
                </button>
              )}
              <Link
                href="/library"
                className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-secondary)] transition hover:text-[var(--color-accent)]"
              >
                Back to Library
              </Link>
            </div>
          </div>
        </div>
      </header>

      {alert && alertTone ? (
        <div className={`${alertTone.container} py-3 text-sm`}>
          <div className="mx-auto flex w-full max-w-5xl items-start gap-4 px-5 sm:px-6 lg:px-8">
            <span aria-hidden="true" className="mt-0.5 text-base">
              {alertTone.icon}
            </span>
            <div className="flex-1">
              <span className="block font-semibold">{alert.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setAlert(null)}
              className={`text-xs font-semibold uppercase tracking-[0.2em] transition ${alertTone.button}`}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {bannerVisible ? (
        <div className="bg-[#e7f1ff] py-3 text-sm text-[var(--color-text-primary)]">
          <div className="mx-auto flex w-full max-w-5xl items-start gap-4 px-5 sm:px-6 lg:px-8">
            <div className="flex-1">
              <strong className="block font-semibold">
                This prompt is part of the premium collection.
              </strong>
              <span className="block text-[var(--color-text-secondary)]">
                Subscribe for $6/month to unlock every prompt in the library.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSubscribeClick("banner")}
                disabled={ctaPending}
                className="btn-primary text-xs font-semibold uppercase tracking-[0.25em] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Subscribe
              </button>
              <button
                type="button"
                onClick={handleBannerDismiss}
                className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
                aria-label="Dismiss subscription banner"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
        <section className="rounded-3xl bg-[var(--color-primary-background)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:p-8" aria-live="polite">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Copy-ready prompt
          </h2>
          <div className="relative mt-4">
            <textarea
              readOnly
              aria-label="Prompt text"
              value={hasAccess ? prompt.body : previewExcerpt}
              className="h-64 w-full resize-none rounded-2xl border border-[var(--color-secondary-background)] bg-[var(--color-secondary-background)]/80 p-4 text-sm leading-relaxed text-[var(--color-text-primary)] shadow-inner focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
            />
            {shouldShowLockedState ? (
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-white/85 to-white" aria-hidden="true" />
            ) : null}
            {shouldShowLockedState ? (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div
                  className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] p-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                  role="dialog"
                  aria-labelledby="locked-prompt-title"
                  aria-describedby="locked-prompt-description"
                >
                  <h3
                    id="locked-prompt-title"
                    className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]"
                  >
                    Subscribe to unlock this prompt
                  </h3>
                  <p id="locked-prompt-description" className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Get the full prompt text, copy functionality, and quick launch shortcuts with a MediPrompt subscription.
                  </p>

                  {subscriptionState.status === "error" ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {subscriptionState.error}
                    </p>
                  ) : null}

                  {ctaError ? (
                    <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {ctaError}
                    </p>
                  ) : null}

                  {isCheckingSubscription ? (
                    <p className="mt-3 text-sm font-medium text-[var(--color-text-secondary)]">
                      {confirmationStatus === "loading"
                        ? "Activating your subscription…"
                        : "Checking your subscription status…"}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleSubscribeClick("overlay")}
                    disabled={ctaPending || isCheckingSubscription}
                    aria-busy={ctaPending || undefined}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,86,179,0.28)] transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {overlayButtonLabel}
                  </button>

                  {subscriptionState.status === "error" ? (
                    <button
                      type="button"
                      onClick={handleRetrySubscriptionCheck}
                      className="mt-3 inline-flex items-center justify-center rounded-full border-2 border-[var(--color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-accent)] transition hover:bg-[#e7f1ff]"
                    >
                      Retry
                    </button>
                  ) : null}

                  <ul className="mt-4 space-y-2 text-left text-sm text-[var(--color-text-secondary)]">
                    {SUBSCRIPTION_BENEFITS.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2">
                        <span aria-hidden="true">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          {hasAccess ? (
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
              Copy button reveals quick launch options for ChatGPT, Claude, and Gemini.
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl bg-[var(--color-primary-background)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Example output subscribers see</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
            {examplePreview.length ? (
              examplePreview.map((snippet, index) => (
                <li key={index}>{snippet}</li>
              ))
            ) : (
              <li>Detailed guidance, follow-up prompts, and closing language tuned for your appointment.</li>
            )}
          </ul>
        </section>

        <section className="rounded-3xl bg-[var(--color-primary-background)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Usage Tips</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
            {resolvedUsageTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-[var(--color-primary-background)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Related Prompts</h2>
          {related.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => {
                const relatedCategory = item.category ?? null;
                return (
                  <Link
                    key={item.id}
                    href={`/library/${item.id}`}
                    className="group flex h-full flex-col rounded-2xl bg-[var(--color-primary-background)] p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
                        {relatedCategory?.name ?? "Prompt"}
                      </span>
                      {item.isFree ? null : (
                        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
                          Premium
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                      {item.shortDescription}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              We&apos;re expanding this category—more prompts coming soon.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
