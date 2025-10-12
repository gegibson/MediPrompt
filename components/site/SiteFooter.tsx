"use client";

import Link from "next/link";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export function SiteFooter() {
  return (
    <footer className="bg-[var(--color-secondary-background)] text-[var(--color-text-secondary)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-5 py-8 text-sm sm:flex-row sm:justify-between sm:px-6 md:px-8">
        <span className="text-[var(--color-text-secondary)]">© 2025 MediPrompt</span>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[var(--color-text-primary)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
