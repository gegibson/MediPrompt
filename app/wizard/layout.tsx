import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wizard — Mediprompt | Safer health prompts",
  description:
    "Generate structured, HIPAA-conscious prompts with educational framing. One free demo, unlimited with subscription.",
  openGraph: {
    title: "Mediprompt Wizard",
    description:
      "Structured, HIPAA-conscious prompts with educational framing. One free demo, unlimited with subscription.",
    images: [
      {
        url: "/og-wizard.svg",
        width: 1200,
        height: 630,
        alt: "Mediprompt Wizard",
      },
    ],
  },
};

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return children;
}

