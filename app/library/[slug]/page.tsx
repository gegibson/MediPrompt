import Link from "next/link";
import { notFound } from "next/navigation";

import { PromptActionPanel } from "@/components/library/PromptActionPanel";
import {
  getServerCategories,
  getServerPromptBody,
  getServerPromptIndex,
} from "@/lib/library/serverData";
import { SITE_URL, buildCanonicalPath } from "@/lib/config/site";
import { SharePromptButton } from "@/components/library/SharePromptButton";
import type { PromptIndexItem } from "@/lib/library/types";

type PromptDetailPageProps = {
  params: {
    slug: string;
  };
};

const LLM_DESTINATIONS = [
  {
    label: "ChatGPT",
    href: "https://chat.openai.com/",
    background: "linear-gradient(135deg,#0FA47F,#0C8C6A)",
  },
  {
    label: "Claude",
    href: "https://claude.ai/new",
    background: "linear-gradient(135deg,#FFB347,#FF6A00)",
  },
  {
    label: "Gemini",
    href: "https://gemini.google.com/app",
    background: "linear-gradient(135deg,#1A73E8,#7B1FA2)",
  },
];

export async function generateStaticParams() {
  const index = await getServerPromptIndex();
  return index.map((entry) => ({ slug: entry.id }));
}

export async function generateMetadata({ params }: PromptDetailPageProps) {
  const prompt = await getServerPromptBody(params.slug);
  if (!prompt) {
    return {};
  }

  const title = `${prompt.title} | MediPrompt`;
  const description = prompt.shortDescription;
  const canonicalPath = `/library/${prompt.id}`;
  const canonicalUrl = buildCanonicalPath(canonicalPath);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      siteName: "MediPrompt",
      images: [
        {
          url: `${SITE_URL}/og-healthcare-library.png`,
          width: 1200,
          height: 630,
          alt: `${prompt.title} prompt preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og-healthcare-library.png`],
    },
  };
}

export default async function PromptDetailPage({ params }: PromptDetailPageProps) {
  const [prompt, categories, index] = await Promise.all([
    getServerPromptBody(params.slug),
    getServerCategories(),
    getServerPromptIndex(),
  ]);

  if (!prompt) {
    notFound();
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const category = categoryMap.get(prompt.categoryId);
  const related = getRelatedFromIndex(index, prompt.id, prompt.categoryId, 3);
  const canonicalPath = `/library/${prompt.id}`;
  const shareUrl = buildCanonicalPath(canonicalPath);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: prompt.title,
    description: prompt.shortDescription,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": shareUrl,
    },
    author: {
      "@type": "Organization",
      name: "MediPrompt",
    },
    publisher: {
      "@type": "Organization",
      name: "MediPrompt",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/og-healthcare-library.png`,
      },
    },
    datePublished: prompt.createdAt ?? new Date().toISOString(),
    dateModified: prompt.createdAt ?? new Date().toISOString(),
    articleSection: category?.name,
  };

  return (
    <div className="bg-[var(--color-surface-subtle)] pb-16">
      <header className="bg-[var(--color-primary)] text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-12 sm:gap-8 sm:px-6 lg:px-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            suppressHydrationWarning
          />
          <nav className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
            <Link href="/library" className="transition hover:text-white">
              Healthcare Library
            </Link>
            <span aria-hidden="true">/</span>
            {category ? (
              <Link
                href={`/library?category=${category.id}`}
                className="transition hover:text-white"
              >
                {category.name}
              </Link>
            ) : (
              <span>Prompt</span>
            )}
            <span aria-hidden="true">/</span>
            <span className="text-white">{prompt.title}</span>
          </nav>

          <div className="space-y-5">
            {category ? (
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                {category.icon}
                {category.name}
              </span>
            ) : null}
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {prompt.title}
            </h1>
            <p className="max-w-2xl text-sm text-white/80 sm:text-base">
              {prompt.shortDescription}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <PromptActionPanel promptText={prompt.body} destinations={LLM_DESTINATIONS} />
              <SharePromptButton url={shareUrl} />
              <Link
                href="/library"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
              >
                Back to Library
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
        <section className="rounded-3xl border border-white/40 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Copy-ready prompt
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Share this prompt with your AI assistant. Keep all personal details anonymous and
            confirm any advice with your care team.
          </p>
          <textarea
            readOnly
            value={prompt.body}
            className="mt-4 h-64 w-full resize-none rounded-2xl border border-slate-200 bg-[var(--color-surface-subtle)] p-4 text-sm leading-relaxed text-[var(--color-foreground)] shadow-inner focus:outline-none"
          />
        </section>

        <section className="rounded-3xl border border-white/40 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Usage Tips
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
            <li>Keep all names, dates, and policy numbers out of the prompt.</li>
            <li>Review the AI output with a clinician before changing any care plan.</li>
            <li>
              Use the prompt as a checklist: highlight questions to discuss during the visit and
              write notes in a separate document.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/40 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Related Prompts
          </h2>
          {related.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/library/${item.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                    {category?.icon}
                    {category?.name}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {item.shortDescription}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              We&apos;re expanding this category—more prompts coming soon.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function getRelatedFromIndex(
  index: PromptIndexItem[],
  id: string,
  categoryId: string,
  limit: number,
): PromptIndexItem[] {
  return index
    .filter((item) => item.id !== id && item.categoryId === categoryId)
    .slice(0, limit);
}
