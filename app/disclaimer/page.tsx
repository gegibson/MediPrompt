import type { Metadata } from "next";

const sections: Array<{
  title: string;
  body: Array<string>;
}> = [
  {
    title: "Educational, not medical advice",
    body: [
      "Mediprompt helps you craft safer prompts for conversations with AI tools. It does not diagnose, treat, or provide personalized medical advice.",
      "Always consult a licensed clinician before making health decisions based on any information generated with Mediprompt.",
    ],
  },
  {
    title: "Emergency situations",
    body: [
      "Do not use Mediprompt or AI chatbots during a medical emergency. Call your local emergency number or seek immediate in-person care.",
    ],
  },
  {
    title: "No clinician relationship",
    body: [
      "Using Mediprompt does not create a doctor–patient relationship or any obligation for our team to monitor your health status.",
    ],
  },
  {
    title: "Limits of AI-generated content",
    body: [
      "AI systems can produce outdated or incorrect responses. Review every output critically and confirm important details with qualified professionals.",
    ],
  },
  {
    title: "Protecting personal information",
    body: [
      "Avoid entering names, dates of birth, addresses, medical record numbers, or other identifiers when crafting prompts. Keeping prompts de-identified is your responsibility.",
      "Refer to our Privacy Policy to understand how account and subscription data is handled.",
    ],
  },
];

export const metadata: Metadata = {
  title: "Medical Disclaimer | Mediprompt",
  description:
    "Understand the limits of Mediprompt. The app is educational only and not a substitute for medical advice or emergency care.",
};

export default function DisclaimerPage() {
  return (
    <div className="bg-[var(--color-secondary-background)] text-[var(--color-text-primary)]">
      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-12 px-6 py-16 sm:px-8 lg:px-10">
        <header className="max-w-3xl space-y-4">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
            Medical disclaimer
          </span>
          <h1 className="text-[32px] font-bold leading-tight sm:text-[42px]">
            Mediprompt is an educational planning tool.
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] sm:text-lg">
            Review these guidelines to understand the limits of the product, how to use it safely, and when you should turn to licensed clinicians instead.
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
            </article>
          ))}
        </section>

        <section className="rounded-3xl bg-[var(--color-primary-background)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Questions about safe use?</h2>
          <p className="mt-2 text-base text-[var(--color-text-secondary)]">
            Email <a className="font-semibold text-[var(--color-accent)]" href="mailto:support@mediprompt.app">support@mediprompt.app</a> and we’ll help you understand how to use Mediprompt responsibly.
          </p>
        </section>
      </main>
    </div>
  );
}
