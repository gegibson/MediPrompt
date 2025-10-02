"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { trackEvent } from "@/lib/analytics/track";

const NAV_LINKS: Array<{ href: string; label: string; target: string; emphasis?: boolean; matchStart?: boolean }> = [
  { href: "/", label: "Home", target: "nav-home" },
  { href: "/templates", label: "Question Templates", target: "nav-templates", matchStart: true },
  { href: "/wizard", label: "Guided Builder", target: "nav-wizard", emphasis: true, matchStart: true },
];

export function SiteHeader() {
  const { user, supabase, openAuthModal, loading } = useAuthContext();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <header className="relative px-4 py-4 sm:px-6 md:px-10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-end gap-2 text-base font-semibold text-slate-900 transition hover:text-primary-dark"
          onClick={() => handleLinkClick("nav-logo")}
        >
          <span className="text-2xl font-semibold text-primary leading-none">MP</span>
          <span className="leading-tight">Mediprompt</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href, link.matchStart);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition hover:text-primary-dark ${active || link.emphasis ? "text-primary font-semibold" : ""}`}
                onClick={() => handleLinkClick(link.target)}
              >
                {link.label}
              </Link>
            );
          })}
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm font-medium text-slate-600 transition hover:text-primary-dark"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="text-sm font-medium text-slate-600 transition hover:text-primary-dark disabled:text-slate-400"
              disabled={loading}
            >
              Sign in
            </button>
          )}
        </nav>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-sm font-medium text-slate-600 transition hover:text-primary-dark md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mp-mobile-nav"
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            <span
              className={`absolute h-0.5 w-4 rounded-full bg-current transition-transform duration-200 ${menuOpen ? "translate-y-0 rotate-45" : "-translate-y-1.5"}`}
            />
            <span
              className={`absolute h-0.5 w-4 rounded-full bg-current transition-opacity duration-200 ${menuOpen ? "opacity-0" : "opacity-100"}`}
            />
            <span
              className={`absolute h-0.5 w-4 rounded-full bg-current transition-transform duration-200 ${menuOpen ? "translate-y-0 -rotate-45" : "translate-y-1.5"}`}
            />
          </span>
        </button>
      </div>
      {menuOpen ? (
        <div
          id="mp-mobile-nav"
          className="mt-3 flex flex-col gap-2 rounded-2xl border border-primary-light bg-white/95 p-4 text-sm font-medium text-slate-600 shadow-lg backdrop-blur md:hidden"
        >
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href, link.matchStart);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-2 transition hover:text-primary-dark ${active || link.emphasis ? "text-primary font-semibold" : ""}`}
                onClick={() => handleLinkClick(link.target)}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="border-t border-slate-200/60 pt-3">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-full px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:text-primary-dark"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="w-full rounded-full px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:text-primary-dark disabled:text-slate-400"
                disabled={loading}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
