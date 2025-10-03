"use client";

import { useEffect, useState } from "react";

import { CopyPromptButton } from "./CopyPromptButton";

type Destination = {
  label: string;
  href: string;
  background: string;
};

type PromptActionPanelProps = {
  promptText: string;
  destinations: Destination[];
};

export function PromptActionPanel({ promptText, destinations }: PromptActionPanelProps) {
  const [showQuickLinks, setShowQuickLinks] = useState(false);

  useEffect(() => {
    if (!showQuickLinks) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setShowQuickLinks(false);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [showQuickLinks]);

  return (
    <div className="relative inline-flex flex-col items-start">
      <CopyPromptButton text={promptText} onCopy={() => setShowQuickLinks(true)} />
      {showQuickLinks ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-0 top-full z-20 mt-3 w-80 max-w-[calc(100vw-4rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl"
        >
          <div className="flex flex-col gap-2">
            {destinations.map((destination) => (
              <a
                key={destination.href}
                href={destination.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: destination.background }}
                className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={`Open ${destination.label} in a new tab`}
              >
                <span className="flex-1 text-left">{destination.label}</span>
                <svg
                  className="h-4 w-4 text-white/80"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M7.5 5H15v7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 15 15 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
