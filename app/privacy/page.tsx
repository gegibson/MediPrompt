import type { Metadata } from "next";

const sections: Array<{
  title: string;
  body: Array<string>;
  bullets?: Array<string>;
}> = [
  {
    title: "Information we collect",
    body: [
      "We only capture the data needed to provide your account and subscription. Prompt inputs and generated text stay in your browser and are never stored on our servers.",
    ],
    bullets: [
      "Account details: email address and hashed password handled by Supabase Auth.",
      "Subscription state: your Supabase profile stores whether you are an active subscriber and the associated timestamps.",
      "Billing information: processed exclusively by Stripe; Mediprompt never sees or stores full payment card data.",
      "Product analytics: Plausible receives anonymous event counts (no cookies, IP addresses, or personal identifiers).",
    ],
  },
  {
    title: "How we use information",
    body: [
      "Account and subscription data keeps your access in sync across the Wizard, checkout flow, and Stripe webhooks.",
      "We send service-related emails (such as password resets or billing confirmations) when necessary.",
      "Aggregate analytics help us understand feature usage and improve the product without tracking individual users.",
    ],
  },
  {
    title: "How we protect information",
    body: [
      "Supabase stores account data in a HIPAA-safe posture with row-level security that limits access to your own record.",
      "All network communication uses TLS. Service role operations run on the server only to maintain subscription state.",
      "Stripe is a PCI-compliant provider that manages payment instruments and receipts for us.",
    ],
  },
  {
    title: "Data processors we rely on",
    body: [
      "We partner with a short list of vendors to operate Mediprompt. Each processor only receives the minimum data required to perform its role.",
    ],
    bullets: [
      "Supabase (authentication, database, email delivery)",
      "Stripe (subscription billing and invoicing)",
      "Plausible Analytics (usage measurement without cookies)",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can update or delete your account data by emailing support@mediprompt.app. We respond within 30 days.",
      "You may opt out of analytics by blocking the Plausible script or using a browser with built-in protections. Mediprompt continues to function without analytics enabled.",
      "Unsubscribing from the paid plan stops future charges immediately; we retain minimal records required for bookkeeping.",
    ],
  },
  {
    title: "Retention",
    body: [
      "We retain account and billing records while your subscription is active and for up to three years afterward to satisfy legal and accounting requirements.",
      "If you request deletion, we remove your Supabase profile and revoke active sessions, while Stripe keeps receipts we are obligated to preserve.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Privacy Policy | Mediprompt",
  description:
    "Learn how Mediprompt handles account, billing, and analytics data while keeping health prompts in your browser.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-[var(--color-secondary-background)] text-[var(--color-text-primary)]">
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-12 px-6 py-16 sm:px-8 lg:px-10">
        <header className="max-w-3xl space-y-4">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
            Privacy policy
          </span>
          <h1 className="text-[32px] font-bold leading-tight sm:text-[42px]">
            Your health questions stay private.
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] sm:text-lg">
            Mediprompt stores only the account and billing details needed to run the service. This policy covers the data we collect, how we use it, and the choices available to you.
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">Last updated: March 20, 2024</p>
        </header>

        <section className="grid gap-8 rounded-3xl bg-[var(--color-primary-background)] p-8 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:p-10">
          {sections.map((section) => (
            <article key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-base text-[var(--color-text-secondary)]">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5 text-base text-[var(--color-text-secondary)]">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-[var(--color-primary-background)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Questions or requests?</h2>
          <p className="mt-2 text-base text-[var(--color-text-secondary)]">
            Email <a className="font-semibold text-[var(--color-accent)]" href="mailto:support@mediprompt.app">support@mediprompt.app</a> if you want to access, update, or delete your data — we’re here to help.
          </p>
        </section>
      </main>
    </div>
  );
}
