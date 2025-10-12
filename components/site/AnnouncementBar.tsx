"use client";

import Link from "next/link";
import { useState } from "react";

export type AnnouncementBarProps = {
  message: string;
  href?: string;
  ctaLabel?: string;
  dismissible?: boolean;
  className?: string;
};

export function AnnouncementBar({
  message,
  href,
  ctaLabel = "Learn more",
  dismissible = true,
  className,
}: AnnouncementBarProps) {
  const [hidden, setHidden] = useState(false);

  if (!message || hidden) {
    return null;
  }

  return (
    <div
      className={`border-b border-[var(--ww-outline)]/25 bg-gradient-to-r from-[var(--ww-blue)]/45 via-white to-[var(--ww-green)]/35 text-[var(--ww-text)] shadow-[0_6px_20px_rgba(119,106,94,0.1)] ${className ?? ""}`.trim()}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 text-center">
        <span
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ww-text)]"
          style={{ fontFamily: "var(--font-patrick-hand)" }}
        >
          <span aria-hidden="true" className="text-base">💡</span>
          {message}
        </span>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-teal)]/60 bg-white/70 px-3 py-1 text-sm font-semibold text-[var(--brand-teal)] shadow-[0_2px_6px_rgba(51,181,172,0.2)] transition hover:border-[var(--brand-teal)] hover:bg-white hover:text-[var(--ww-outline)]"
          >
            {ctaLabel}
          </Link>
        ) : null}
        {dismissible ? (
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--ww-outline)]/30 text-xs font-semibold text-[var(--ww-muted)] transition hover:border-[var(--brand-teal)]/60 hover:text-[var(--brand-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-teal)]"
            aria-label="Dismiss announcement"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
