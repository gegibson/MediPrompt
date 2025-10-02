import type { Metadata } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { getPlausibleConfig } from "@/lib/analytics/plausible";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mediprompt — Patient Question Templates & Guided Builder",
  description:
    "Create clearer health questions with clinician-reviewed templates and a HIPAA-conscious Guided Builder. Informational only — never share PHI.",
  openGraph: {
    title: "Mediprompt — Patient Question Templates & Guided Builder",
    description:
      "Browse patient-safe question templates or launch the Guided Builder for tailored prompts that keep personal health information private.",
    images: [
      {
        url: "/og-mediprompt-default.svg",
        width: 1200,
        height: 630,
        alt: "Mediprompt patient question templates and guided builder preview",
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
  const bodyClassName = `${sourceSans.variable} ${manrope.variable} antialiased`;

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
