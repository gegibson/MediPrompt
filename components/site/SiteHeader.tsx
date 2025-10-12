"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuthContext } from "@/components/auth/AuthProvider";

type NavItem = {
  href: string;
  label: string;
  prefetch?: boolean;
};

const primaryNavItems: NavItem[] = [
  { href: "/", label: "Home" },
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
  const router = useRouter();
  const { user, openAuthModal } = useAuthContext();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === href;
    }

    return pathname?.startsWith(href);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/library?q=${encodeURIComponent(trimmed)}`);
    setSearchValue("");
    setIsSearchOpen(false);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-primary-background)] shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-white/80 px-4 py-1.5 text-lg font-semibold text-[var(--brand-teal)] shadow-[0_4px_12px_rgba(51,181,172,0.18)] transition hover:-translate-y-[1px] hover:text-[var(--ww-outline)]"
          >
            MediPrompt
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-text-secondary)] md:flex">
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
                    ? "text-[var(--color-text-primary)]"
                    : "hover:text-[var(--color-accent)]"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-2 block h-0.5 rounded-full bg-[var(--color-accent)]" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen((open) => !open);
                setIsMenuOpen(false);
              }}
              aria-label={isSearchOpen ? "Close search" : "Open search"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M20 20 16.65 16.65"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isSearchOpen ? (
              <form
                className="absolute right-0 top-14 z-30 flex w-[min(20rem,80vw)] items-center gap-2 rounded-2xl border border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                onSubmit={handleSearchSubmit}
              >
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
                />
                <button type="submit" className="text-sm font-semibold text-[var(--color-accent)] transition hover:text-[var(--color-accent-hover)]">
                  Search
                </button>
              </form>
            ) : null}
          </div>

          {user ? (
            <Link
              href="/profile"
              prefetch
              aria-label="Account"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5ZM4 21c0-3.87 3.58-7 8-7s8 3.13 8 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={openAuthModal}
                className="hidden rounded-full border border-[var(--color-secondary-background)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] md:inline-flex"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={openAuthModal}
                aria-label="Sign in"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] md:hidden"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5ZM4 21c0-3.87 3.58-7 8-7s8 3.13 8 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ww-outline)]/25 bg-white/80 text-[var(--ww-muted)] transition hover:border-[var(--brand-teal)]/40 hover:text-[var(--brand-teal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-teal)] md:hidden"
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

      {isMenuOpen ? (
        <div className="border-t border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] p-4 shadow-inner md:hidden">
          <nav className="flex flex-col gap-3 text-base font-medium text-[var(--color-text-secondary)]">
            {drawerNavItems.map((item) => {
              if (!user && item.href === "/profile") {
                return null;
              }
              return (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  prefetch={item.prefetch ?? true}
                  className="rounded-md px-3 py-2 transition hover:bg-[var(--color-secondary-background)] hover:text-[var(--color-text-primary)]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            {!user ? (
              <button
                type="button"
                className="rounded-md px-3 py-2 text-left transition hover:bg-[var(--color-secondary-background)] hover:text-[var(--color-text-primary)]"
                onClick={() => {
                  openAuthModal();
                  setIsMenuOpen(false);
                }}
              >
                Sign in
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
