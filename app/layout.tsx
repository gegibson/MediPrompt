import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { getPlausibleConfig } from "@/lib/analytics/plausible";

export const metadata: Metadata = {
  title: "Mediprompt — Healthcare Prompt Library & AI Wizard",
  description:
    "Browse clinician-designed healthcare prompt templates or build your own with the Mediprompt AI Wizard. Privacy-first, educational only, zero PHI storage.",
  openGraph: {
    title: "Mediprompt — Healthcare Prompt Library & AI Wizard",
    description:
      "Explore the Healthcare Prompt Library or launch the AI Wizard to craft safer conversations with clinicians.",
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
        <AuthProvider>{children}</AuthProvider>
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
