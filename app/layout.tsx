import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { getPlausibleConfig } from "@/lib/analytics/plausible";

export const metadata: Metadata = {
  title: "Mediprompt — Safer AI health prompts",
  description:
    "Mediprompt helps patients and caregivers craft safer, clearer health prompts with educational framing and no PHI storage.",
  openGraph: {
    title: "Mediprompt — Safer AI health prompts",
    description:
      "Craft safer, clearer health prompts with educational framing and no PHI storage.",
    images: [
      {
        url: "/og-default.svg",
        width: 1200,
        height: 630,
        alt: "Mediprompt",
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
