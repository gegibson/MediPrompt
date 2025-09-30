'use client';

import { useCallback, useEffect, useState } from "react";
export default function UserProfilePage({ user, profile, subscription }) {
  const metadata = user?.user_metadata ?? {};
  const displayName = [
    metadata.full_name,
    metadata.name,
    metadata.display_name,
    metadata.preferred_name,
  ].find((value) => typeof value === "string" && value.trim().length > 0);
  const sanitizedName = displayName?.trim() || (user?.email ?? "").split("@")[0] || "Not provided";
  const email = user?.email ?? "Not provided";
  const [subscriptionState, setSubscriptionState] = useState(subscription ?? null);

  useEffect(() => {
    setSubscriptionState(subscription ?? null);
  }, [subscription]);

  const hasSubscription = Boolean(subscriptionState);
  const isSubscriber = Boolean(profile?.is_subscriber || hasSubscription);
  const cancelAtPeriodEnd = Boolean(subscriptionState?.cancelAtPeriodEnd);
  const currentPeriodEndLabel = (() => {
    if (!subscriptionState?.currentPeriodEnd) {
      return null;
    }

    const parsed = new Date(subscriptionState.currentPeriodEnd);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  })();

  const planLabel = isSubscriber ? "Unlimited plan" : "Free preview";
  const subscriptionStatus = !isSubscriber
    ? "Not active"
    : cancelAtPeriodEnd
      ? "Scheduled to cancel"
      : "Active";
  const subscriptionStartedOn = (() => {
    const raw = profile?.subscribed_at;
    if (!raw) {
      return null;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  })();

  const [upgradeStatus, setUpgradeStatus] = useState("idle");
  const [cancelStatus, setCancelStatus] = useState("idle");
  const [resumeStatus, setResumeStatus] = useState("idle");
  const [upgradeError, setUpgradeError] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const statusHelperText = isSubscriber
    ? cancelAtPeriodEnd
      ? currentPeriodEndLabel
        ? `Cancels after your current period on ${currentPeriodEndLabel}.`
        : "Cancellation is scheduled at the end of the current period."
      : subscriptionStartedOn
        ? `Active since ${subscriptionStartedOn}`
        : "Subscription is active."
    : "Upgrade whenever you’re ready to unlock unlimited prompts.";

  const handleUpgrade = useCallback(async () => {
    setUpgradeStatus("loading");
    setUpgradeError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const hint =
          typeof errorPayload?.hint === "string"
            ? errorPayload.hint
            : "Unable to start checkout.";
        throw new Error(hint);
      }

      const data = await response.json();

      if (!data?.url) {
        throw new Error("Checkout session missing redirect URL.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Upgrade failed", error);
      setUpgradeError(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
      setUpgradeStatus("error");
    }
  }, []);

  const handleCancelSubscription = useCallback(async () => {
    setCancelStatus("loading");
    setCancelError("");
    setResumeError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const hint =
          typeof errorPayload?.hint === "string"
            ? errorPayload.hint
            : "Unable to schedule cancellation.";
        throw new Error(hint);
      }

      const data = await response.json();

      setSubscriptionState((previous) => ({
        ...(previous ?? {}),
        id: data.subscriptionId ?? previous?.id ?? null,
        status: data.status ?? previous?.status ?? "active",
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
        currentPeriodEnd: data.currentPeriodEnd ?? previous?.currentPeriodEnd ?? null,
        cancelAt: data.cancelAt ?? previous?.cancelAt ?? null,
      }));

      const cancelDate = data.currentPeriodEnd
        ? new Date(data.currentPeriodEnd).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : null;

      setSuccessMessage(
        cancelDate
          ? `Your subscription will remain active until ${cancelDate}, then cancel automatically.`
          : "Your subscription will cancel at the end of the current billing period.",
      );
      setCancelStatus("success");
    } catch (error) {
      console.error("Cancel subscription failed", error);
      setCancelError(
        error instanceof Error
          ? error.message
          : "Unable to schedule cancellation.",
      );
      setCancelStatus("error");
    }
  }, []);

  const handleResumeSubscription = useCallback(async () => {
    setResumeStatus("loading");
    setResumeError("");
    setCancelError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/stripe/resume-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const hint =
          typeof errorPayload?.hint === "string"
            ? errorPayload.hint
            : "Unable to resume subscription.";
        throw new Error(hint);
      }

      const data = await response.json();

      setSubscriptionState((previous) => ({
        ...(previous ?? {}),
        id: data.subscriptionId ?? previous?.id ?? null,
        status: data.status ?? previous?.status ?? "active",
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
        currentPeriodEnd: data.currentPeriodEnd ?? previous?.currentPeriodEnd ?? null,
        cancelAt: data.cancelAt ?? previous?.cancelAt ?? null,
      }));

      setSuccessMessage("Your subscription will continue past the current billing period.");
      setResumeStatus("success");
    } catch (error) {
      console.error("Resume subscription failed", error);
      setResumeError(
        error instanceof Error ? error.message : "Unable to resume subscription.",
      );
      setResumeStatus("error");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 md:px-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">My Profile</h1>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Account Information</h2>
          <p className="mt-1 text-sm text-slate-600">
            Review the basic details associated with your Mediprompt account.
          </p>

          <dl className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </dt>
              <dd className="mt-1 text-base font-medium text-slate-900">
                {sanitizedName}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </dt>
              <dd className="mt-1 text-base font-medium text-slate-900">
                {email}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Plan
              </dt>
              <dd className="mt-1 text-base font-medium text-slate-900">
                {planLabel}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subscription status
              </dt>
              <dd className="mt-1 text-base font-medium text-slate-900">
                {subscriptionStatus}
                <span className="mt-1 block text-sm font-normal text-slate-500">
                  {statusHelperText}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isSubscriber ? (
              <>
                {cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    onClick={handleResumeSubscription}
                    disabled={resumeStatus === "loading"}
                    className="rounded-full border border-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:text-emerald-300"
                  >
                    {resumeStatus === "loading" ? "Resuming..." : "Resume subscription"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={cancelStatus === "loading"}
                    className="rounded-full border border-rose-400 px-5 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-rose-200 disabled:text-rose-300"
                  >
                    {cancelStatus === "loading" ? "Scheduling cancellation..." : "Cancel subscription"}
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgradeStatus === "loading"}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {upgradeStatus === "loading" ? "Preparing checkout..." : "Upgrade to Unlimited"}
              </button>
            )}
          </div>

          <p className="mt-3 text-sm text-slate-600">
            {isSubscriber
              ? cancelAtPeriodEnd
                ? "Your plan stays active until the end of the current billing period. Resume any time before it ends."
                : "Cancel any time. You’ll keep access through the current billing period."
              : "Upgrade for unlimited prompt generation and premium support."}
          </p>

          {successMessage ? (
            <p className="mt-3 text-sm text-emerald-700">{successMessage}</p>
          ) : null}

          {upgradeError && !isSubscriber ? (
            <p className="mt-3 text-sm text-rose-600">{upgradeError}</p>
          ) : null}

          {/* Portal removed intentionally; no manage error to display */}

          {cancelError ? (
            <p className="mt-3 text-sm text-rose-600">{cancelError}</p>
          ) : null}

          {resumeError ? (
            <p className="mt-3 text-sm text-rose-600">{resumeError}</p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
