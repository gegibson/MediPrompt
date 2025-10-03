"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  prefetch?: boolean;
};

const primaryNavItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/wizard", label: "AI Wizard" },
  { href: "/library", label: "Healthcare Library", prefetch: false },
];

const drawerNavItems: NavItem[] = [
  ...primaryNavItems,
  { href: "/profile", label: "Account" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === href;
    }

    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-lg font-semibold text-[var(--color-primary)] transition hover:text-[var(--color-accent)]"
          >
            MediPrompt
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-muted)] md:flex">
          {primaryNavItems.map((item) => {
            const active = isActive(item.href);
            const shouldPrefetch = item.prefetch ?? true;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={shouldPrefetch}
                className={`relative transition-colors ${
                  active
                    ? "text-[var(--color-foreground)]"
                    : "hover:text-[var(--color-foreground)]"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-2 block h-0.5 bg-[var(--color-primary)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open search"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-[var(--color-muted)] transition hover:border-slate-300 hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] md:inline-flex"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M20 20 16.65 16.65"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-[var(--color-muted)] transition hover:border-slate-300 hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            aria-label="View cart"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M7 8h15l-1.5 9h-12L6 3H2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
          </button>
          <Link
            href="/profile"
            prefetch
            aria-label="Account"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-[var(--color-muted)] transition hover:border-slate-300 hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5ZM4 21c0-3.866 3.582-7 8-7s8 3.134 8 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-[var(--color-muted)] transition hover:border-slate-300 hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1h18M1 7h18M1 13h18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* TODO: Implement slide-out navigation menu */}
      {isMenuOpen ? (
        <div className="border-t border-slate-200 bg-[var(--color-surface)] p-4 md:hidden">
          <nav className="flex flex-col gap-3 text-base font-medium text-[var(--color-muted)]">
            {drawerNavItems.map((item) => (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                prefetch={item.prefetch ?? true}
                className="rounded-md px-2 py-2 transition hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)]"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              className="rounded-md px-2 py-2 text-left text-[var(--color-muted)] transition hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-foreground)]"
            >
              Sign out
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
