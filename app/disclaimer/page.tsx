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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16 md:px-10">
        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Medical disclaimer
        </span>
        <div className="grid gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Mediprompt is an educational planning tool.
          </h1>
          <p className="text-base text-slate-700 md:text-lg">
            We built Mediprompt to encourage safer conversations with AI. Please review the guidelines below so you understand how to use the product responsibly.
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
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-sm text-emerald-900 md:text-base">
          <h2 className="text-lg font-semibold text-emerald-900">
            Questions about safe use?
          </h2>
          <p className="mt-2">
            Email <a className="font-semibold underline" href="mailto:support@mediprompt.app">support@mediprompt.app</a> and we&apos;ll help you understand how to use Mediprompt responsibly.
          </p>
        </section>
      </main>
    </div>
  );
}
