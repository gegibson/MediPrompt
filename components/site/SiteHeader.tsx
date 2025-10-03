"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { trackEvent } from "@/lib/analytics/track";

const NAV_LINKS: Array<{ href: string; label: string; target: string; emphasis?: boolean; matchStart?: boolean }> = [
  { href: "/", label: "Home", target: "nav-home" },
  { href: "/templates", label: "Question Templates", target: "nav-templates", matchStart: true },
  { href: "/wizard", label: "Guided Builder", target: "nav-wizard", emphasis: true, matchStart: true },
  { href: "/privacy", label: "Privacy", target: "nav-privacy" },
  { href: "/terms", label: "Terms", target: "nav-terms" },
];

const SOCIAL_LINKS: Array<{ href: string; label: string; icon: ReactElement }> = [
  {
    href: "https://instagram.com",
    label: "Instagram",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "https://tiktok.com",
    label: "TikTok",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M14.5 5.5c1.3 1.5 2.6 2.2 4 2.3v3.1c-1.7-.1-3.1-.6-4.5-1.6v6.2c0 2.8-2.3 5-5.1 5-1.2 0-2.3-.4-3.2-1.1C4.6 18.4 4 17.1 4 15.6c0-2.8 2.3-5 5.1-5 .3 0 .6 0 .9.1v3.2c-.3-.1-.6-.2-.9-.2-1.1 0-2 1-2 2.1s.9 2.1 2 2.1c1.1 0 2-1 2-2.1V3h3.3c.2 1.1.6 1.9 1.1 2.5Z" />
      </svg>
    ),
  },
  {
    href: "https://youtube.com",
    label: "YouTube",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M3.3 8.3C4 6 5.4 5.6 8.4 5.5 10.6 5.4 13.4 5.4 15.6 5.5c3 .1 4.4.5 5.1 2.8.3 1 .3 3.2.3 3.2s0 2.2-.3 3.2c-.7 2.3-2.1 2.7-5.1 2.8-2.2.1-5 .1-7.2 0-3-.1-4.4-.5-5.1-2.8C3 14.2 3 12 3 12s0-2.2.3-3.2Z" />
        <path d="m10.5 9.5 4.4 2.5-4.4 2.5V9.5Z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "https://facebook.com",
    label: "Facebook",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M14.5 7H17V3.5h-2.5c-2.7 0-4.5 1.7-4.5 4.3v2.2H8v3.6h2v7.4h3.6v-7.4h2.4l.4-3.6H13V8.3c0-.8.3-1.3 1.5-1.3Z" />
      </svg>
    ),
  },
  {
    href: "https://pinterest.com",
    label: "Pinterest",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M12 3c4.4 0 7.5 3 7.5 6.9 0 3.7-2.3 6.3-5.6 6.3-1.1 0-2.2-.6-2.6-1.3l-1 3.8-.1.3-.1.3-.3-.1c-1.3-.4-2.2-1.6-2-3l1.2-4.8c-.3-.6-.5-1.4-.5-2.2 0-2.6 2-4.6 4.5-4.6 1.9 0 3.2 1.1 3.2 2.7 0 2-.9 3.7-2.1 3.7-.7 0-1.2-.5-1-1.5.2-.8.6-1.8.6-2.4 0-.6-.3-1-.9-1-1 0-1.8 1-1.8 2.4 0 .9.3 1.5.3 1.5l-1.2 5c-.3 1.3 0 2.8.1 4 .1.1.1.2.1.2s.1 0 .1-.1c.6-.8 1.4-2.1 1.6-3l.5-1.9c.4.8 1.7 1.5 3.2 1.5 3.8 0 6.4-3.1 6.4-7.2C19.4 5.6 16.2 3 12 3Z" />
      </svg>
    ),
  },
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M3 4h2l2.4 10.5c.2.8.9 1.5 1.8 1.5h8.2c.8 0 1.5-.6 1.7-1.3L21 7H6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function SiteHeader() {
  const { user, supabase, openAuthModal, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const originalOverflowRef = useRef<string | undefined>(undefined);

  const isActive = (href: string, matchStart?: boolean) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (matchStart) {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      void router.prefetch("/profile");
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Profile prefetch failed", error);
      }
    }
  }, [router]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const { body } = document;
    if (menuOpen) {
      originalOverflowRef.current = body.style.overflow;
      body.style.overflow = "hidden";
    } else if (originalOverflowRef.current !== undefined) {
      body.style.overflow = originalOverflowRef.current;
      originalOverflowRef.current = undefined;
    }
    return () => {
      if (originalOverflowRef.current !== undefined) {
        body.style.overflow = originalOverflowRef.current;
        originalOverflowRef.current = undefined;
      }
    };
  }, [menuOpen]);

  const handleLinkClick = (target: string) => {
    trackEvent("cta_clicked", {
      location: "global-nav",
      type: "nav",
      target,
    });
  };

  const handleSignIn = () => {
    trackEvent("auth_modal_open", { source: "global-nav" });
    openAuthModal();
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      trackEvent("auth_signed_out", { source: "global-nav" });
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleSearchClick = () => {
    handleLinkClick("nav-search");
  };

  return (
    <header className="relative z-50 border-b border-[color:var(--color-border-strong)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6 md:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold text-ink-primary transition hover:text-[color:var(--color-primary-dark)]"
          onClick={() => handleLinkClick("nav-logo")}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-primary-light)] text-sm font-semibold text-[color:var(--color-primary)]">
            MP
          </span>
          <span className="leading-tight">Mediprompt</span>
        </Link>
        <div className="flex items-center gap-4 text-ink-primary">
          <button
            type="button"
            onClick={handleSearchClick}
            className="rounded-full p-2 transition hover:bg-[color:var(--color-primary-light)] hover:text-[color:var(--color-primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
          <Link
            href="/profile"
            onClick={() => handleLinkClick("nav-cart")}
            className="rounded-full p-2 transition hover:bg-[color:var(--color-primary-light)] hover:text-[color:var(--color-primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            aria-label="Account"
            prefetch
          >
            <CartIcon />
          </Link>
          <button
            type="button"
            className="rounded-full p-2 transition hover:bg-[color:var(--color-primary-light)] hover:text-[color:var(--color-primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mp-mobile-nav"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div
          id="mp-mobile-nav"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex min-h-dvh flex-col overflow-y-auto bg-white/98 px-6 pb-12 pt-6 text-ink-primary shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-semibold"
              onClick={() => {
                handleLinkClick("nav-logo-mobile");
                setMenuOpen(false);
              }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-primary-light)] text-sm font-semibold text-[color:var(--color-primary)]">
                MP
              </span>
              <span className="leading-tight">Mediprompt</span>
            </Link>
            <button
              type="button"
              className="rounded-full p-2 text-ink-primary transition hover:bg-[color:var(--color-primary-light)] hover:text-[color:var(--color-primary-dark)]"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="mt-14 flex flex-col items-center gap-6 text-center text-lg font-semibold">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, link.matchStart);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition hover:text-[color:var(--color-primary-dark)] ${active || link.emphasis ? "text-[color:var(--color-primary)]" : ""}`}
                  onClick={() => {
                    handleLinkClick(link.target);
                    setMenuOpen(false);
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-12 flex flex-col items-center gap-4">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full max-w-sm rounded-full border border-[color:var(--color-border)] px-5 py-3 text-sm font-medium transition hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="w-full max-w-sm rounded-full border border-[color:var(--color-border)] px-5 py-3 text-sm font-medium transition hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] disabled:border-[color:var(--color-border-strong)] disabled:text-[color:var(--color-border-strong)]"
                disabled={loading}
              >
                Log in
              </button>
            )}

            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-[color:var(--color-primary-dark)]"
            >
              English
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-ink-muted">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition hover:text-[color:var(--color-primary)]"
                aria-label={item.label}
                target="_blank"
                rel="noreferrer"
              >
                {item.icon}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
