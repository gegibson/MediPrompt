import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getPlausibleConfig } from "@/lib/analytics/plausible";
import { SiteFooter } from "@/components/site/SiteFooter";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediprompt.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mediprompt — Healthcare Prompt Library",
  description:
    "Browse clinician-crafted healthcare AI prompt templates to guide safe, effective conversations without sharing personal data.",
  openGraph: {
    title: "Mediprompt — Healthcare Prompt Library",
    description:
      "Copy trusted healthcare AI prompts to stay prepared for every conversation while protecting your privacy.",
    images: [
      {
        url: "/og-healthcare-library.png",
        width: 1200,
        height: 630,
        alt: "Mediprompt Healthcare Prompt Library preview",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausible = getPlausibleConfig();
  const bodyClassName = "antialiased";

  return (
    <html lang="en">
      <body className={bodyClassName}>
        <AuthProvider>
          <SiteHeader />
          <main className="min-h-screen bg-[var(--color-background)]">
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
        {plausible.enabled ? (
          <Script
            src={plausible.scriptSrc}
            data-domain={plausible.domain}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
