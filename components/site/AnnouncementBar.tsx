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
      className={`border-b border-slate-200 bg-[var(--color-surface-subtle)] text-[var(--color-muted)] ${className ?? ""}`.trim()}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 text-center">
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          {message}
        </span>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-accent)]"
          >
            {ctaLabel}
          </Link>
        ) : null}
        {dismissible ? (
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-[var(--color-muted)] transition hover:border-slate-400 hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-label="Dismiss announcement"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
