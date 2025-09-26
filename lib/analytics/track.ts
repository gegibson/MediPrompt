"use client";

import { PLAUSIBLE_ENABLED } from "@/lib/analytics/plausible";

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string> }) => void;
  }
}

type EventValue = string | number | boolean;

export type PlausibleEventProps = Record<string, EventValue | null | undefined>;

export function trackEvent(eventName: string, props?: PlausibleEventProps) {
  // Client-only debug helper: log events when URL contains ?debug=events
  if (typeof window !== "undefined") {
    const search = window.location?.search || "";
    const debugEvents = /(?:\?|&)debug=events(?:&|$)/.test(search);
    if (debugEvents) {
      // Log even if Plausible is disabled to aid local/staging testing
      try {
        console.debug("[analytics]", eventName, props ?? {});
      } catch {
        // no-op
      }
    }
  }

  if (!PLAUSIBLE_ENABLED) {
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  const plausible = window.plausible;

  if (typeof plausible !== "function") {
    return;
  }

  const filteredProps = props
    ? Object.entries(props).reduce<Record<string, string>>((accumulator, [key, value]) => {
        if (value === undefined || value === null) {
          return accumulator;
        }

        accumulator[key] = typeof value === "string" ? value : String(value);
        return accumulator;
      }, {})
    : undefined;

  try {
    plausible(eventName, filteredProps ? { props: filteredProps } : undefined);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Plausible event failed", error);
    }
  }
}
