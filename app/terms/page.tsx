import type { Metadata } from "next";

const sections: Array<{
  title: string;
  body: Array<string>;
  bullets?: Array<string>;
}> = [
  {
    title: "Agreement to terms",
    body: [
      "Mediprompt provides educational prompt-writing assistance so you can talk to large language models more safely. By accessing or using the app you agree to these Terms of Service and our Privacy Policy.",
      "If you do not agree, do not use the product. We may update these terms occasionally; continued use means you accept the revised version.",
    ],
  },
  {
    title: "Eligibility and account security",
    body: [
      "You must be at least 18 years old and legally able to enter into contracts to create an account.",
      "Keep your login credentials confidential. You are responsible for all activity that occurs under your account and must notify us of any unauthorized access immediately.",
    ],
  },
  {
    title: "Appropriate use",
    body: [
      "Mediprompt is designed to help you frame conversations about health topics without entering personal identifiers or protected health information.",
      "Do not upload sensitive identifiers, spam the service, reverse engineer our systems, or use the product in violation of any law or regulation.",
      "You remain responsible for how you use any prompts generated and for complying with terms of the downstream AI tools you engage.",
    ],
  },
  {
    title: "Subscriptions and billing",
    body: [
      "We offer a recurring subscription billed through Stripe. Prices are listed in USD unless stated otherwise.",
    ],
    bullets: [
      "Each subscription renews automatically until you cancel.",
      "You can cancel anytime from the Stripe customer portal linked in your receipt emails.",
      "We may change pricing with at least 14 days' notice to the email on file.",
      "Taxes and levies are added when required by law.",
    ],
  },
  {
    title: "Refunds",
    body: [
      "Because Mediprompt delivers immediate access to digital content, all fees are non-refundable unless required by applicable law.",
      "If you believe you were charged in error, contact support within 7 days and we will review the request.",
    ],
  },
  {
    title: "Service availability and changes",
    body: [
      "We aim to keep Mediprompt available but may modify, suspend, or discontinue features at any time. Planned downtime will be communicated when practical.",
      "Beta or preview features may be offered with additional terms. We are not liable for any loss resulting from service interruptions.",
    ],
  },
  {
    title: "Disclaimer and limitation of liability",
    body: [
      "Mediprompt does not provide medical advice, diagnosis, or treatment. Generated prompts are educational only and must be reviewed with licensed clinicians before taking action.",
      "To the fullest extent permitted by law, Mediprompt and its team are not liable for indirect, incidental, or consequential damages arising from use of the service.",
    ],
  },
  {
    title: "Governing law and contact",
    body: [
      "These terms are governed by the laws of the State of Washington, USA, without regard to conflict of law rules.",
      "Questions about the service or these terms can be sent to support@mediprompt.app.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Terms of Service | Mediprompt",
  description:
    "Understand the rules for using Mediprompt, including subscriptions, acceptable use, and legal disclaimers.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16 md:px-10">
        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Terms of service
        </span>
        <div className="grid gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Use Mediprompt responsibly.
          </h1>
          <p className="text-base text-slate-700 md:text-lg">
            These terms describe your responsibilities, how subscriptions work, and the limits of our service. Please read them carefully before continuing.
          </p>
          <p className="text-sm text-slate-500">
            Last updated: March 20, 2024
          </p>
        </div>

        <section className="grid gap-8 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          {sections.map((section) => (
            <article key={section.title} className="grid gap-3">
              <h2 className="text-xl font-semibold text-slate-900">
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm text-slate-600 md:text-base">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="list-outside list-disc space-y-2 pl-5 text-sm text-slate-600 md:text-base">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-sm text-emerald-900 md:text-base">
          <h2 className="text-lg font-semibold text-emerald-900">
            Need clarification?
          </h2>
          <p className="mt-2">
            Email <a className="font-semibold underline" href="mailto:support@mediprompt.app">support@mediprompt.app</a> and we&apos;ll answer questions about these terms or your subscription.
          </p>
        </section>
      </main>
    </div>
  );
}
