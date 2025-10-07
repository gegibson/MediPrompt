"use client";

import { trackEvent } from "@/lib/analytics/track";

type CheckoutResult =
  | { status: "already-active" }
  | { status: "auth" }
  | { status: "redirected" }
  | { status: "error"; message: string };

type InitiateSubscriptionCheckoutOptions = {
  hasAccess: boolean;
  isLoggedIn: boolean;
  openAuthModal: () => void;
  returnPath?: string;
  source?: string;
};

export const CHECKOUT_SESSION_STORAGE_KEY = "mp-last-checkout-session";
export const CHECKOUT_RETURN_PATH_STORAGE_KEY = "mp-last-return-path";

function sanitizeReturnPath(returnPath?: string): string | null {
  if (!returnPath) {
    return null;
  }

  const trimmed = returnPath.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return null;
  }

  try {
    // Prevent fully qualified URLs from sneaking through.
    const url = new URL(trimmed, "https://example.com");
    if (url.origin !== "https://example.com") {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function consumeStoredCheckoutSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
  if (stored) {
    window.sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
    return stored;
  }
  return null;
}

export function peekStoredCheckoutSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
}

export function consumeStoredReturnPath(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.sessionStorage.getItem(CHECKOUT_RETURN_PATH_STORAGE_KEY);
  if (stored) {
    window.sessionStorage.removeItem(CHECKOUT_RETURN_PATH_STORAGE_KEY);
    return stored;
  }
  return null;
}

export async function initiateSubscriptionCheckout(
  options: InitiateSubscriptionCheckoutOptions,
): Promise<CheckoutResult> {
  const { hasAccess, isLoggedIn, openAuthModal, returnPath, source } = options;

  if (hasAccess) {
    if (typeof window !== "undefined") {
      window.location.href = "/profile";
    }
    return { status: "already-active" };
  }

  if (!isLoggedIn) {
    openAuthModal();
    return { status: "auth" };
  }

  const sanitizedPath = sanitizeReturnPath(
    returnPath ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
  );

  try {
    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ returnPath: sanitizedPath }),
    });

    if (response.status === 401) {
      openAuthModal();
      return { status: "auth" };
    }

    if (response.status === 501) {
      const payload = await response.json().catch(() => ({}));
      const hint =
        typeof payload?.hint === "string"
          ? payload.hint
          : "Stripe checkout is not configured yet. Add your Stripe keys to enable subscriptions.";
      return { status: "error", message: hint };
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const hint =
        typeof payload?.hint === "string"
          ? payload.hint
          : typeof payload?.error === "string"
            ? payload.error
            : "Unable to start checkout. Please try again.";
      throw new Error(hint);
    }

    const data = (await response.json()) as {
      url?: string | null;
      sessionId?: string | null;
    };

    if (!data?.url) {
      throw new Error("Checkout session missing redirect URL.");
    }

    if (typeof window !== "undefined") {
      if (data.sessionId) {
        window.sessionStorage.setItem(
          CHECKOUT_SESSION_STORAGE_KEY,
          data.sessionId,
        );
      }

      if (sanitizedPath) {
        window.sessionStorage.setItem(
          CHECKOUT_RETURN_PATH_STORAGE_KEY,
          sanitizedPath,
        );
      }

      trackEvent("subscription_checkout_session_start", {
        location: "prompt",
        source,
      });

      window.location.href = data.url;
    }

    return { status: "redirected" };
  } catch (error) {
    console.error("Unable to initiate checkout", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to start checkout. Please try again.";
    return { status: "error", message };
  }
}
