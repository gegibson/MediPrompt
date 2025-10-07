import { notFound } from "next/navigation";

import {
  getServerCategories,
  getServerPromptBody,
  getServerPromptIndex,
} from "@/lib/library/serverData";
import { SITE_URL, buildCanonicalPath } from "@/lib/config/site";
import type {
  LibraryCategory,
  PromptBody,
  PromptIndexItem,
} from "@/lib/library/types";
import { PromptDetailClient, type RelatedPrompt } from "@/components/library/PromptDetailClient";

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
  const category = categoryMap.get(prompt.categoryId) ?? null;
  const related = resolveRelatedPrompts(prompt, index, categoryMap, 4);
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
    <PromptDetailClient
      prompt={prompt}
      category={category}
      related={related}
      shareUrl={shareUrl}
      jsonLd={jsonLd}
      llmDestinations={LLM_DESTINATIONS}
    />
  );
}

function resolveRelatedPrompts(
  prompt: PromptBody,
  index: PromptIndexItem[],
  categories: Map<string, LibraryCategory>,
  limit: number,
): RelatedPrompt[] {
  const explicitIds = prompt.relatedPrompts ?? [];
  const uniqueIds = new Set<string>();
  const related: RelatedPrompt[] = [];

  for (const relatedId of explicitIds) {
    if (related.length >= limit) {
      break;
    }
    if (uniqueIds.has(relatedId) || relatedId === prompt.id) {
      continue;
    }
    const item = index.find((entry) => entry.id === relatedId);
    if (!item) {
      continue;
    }
    const withCategory: RelatedPrompt = {
      ...item,
      category: categories.get(item.categoryId) ?? null,
    };
    related.push(withCategory);
    uniqueIds.add(relatedId);
  }

  if (related.length < limit) {
    for (const candidate of index) {
      if (related.length >= limit) {
        break;
      }
      if (candidate.id === prompt.id || uniqueIds.has(candidate.id)) {
        continue;
      }
      if (candidate.categoryId !== prompt.categoryId) {
        continue;
      }
      related.push({
        ...candidate,
        category: categories.get(candidate.categoryId) ?? null,
      });
      uniqueIds.add(candidate.id);
    }
  }

  return related.slice(0, limit);
}
