import { trackEvent } from "@/lib/analytics/track";

export type LibraryFilterEvent = {
  query: string;
  categories: string[];
  situations: string[];
  audiences: string[];
  sort: string;
};

export type LibraryZeroResultEvent = {
  query: string;
  categories: string[];
  situations: string[];
  audiences: string[];
};

export type LibraryPromptEvent = {
  promptId: string;
  categoryId?: string | null;
};

export type LibraryQuickLaunchEvent = LibraryPromptEvent & {
  destination: string;
};

function safeString(value: string | undefined | null) {
  return value ? String(value) : undefined;
}

export function trackLibraryFilters(event: LibraryFilterEvent) {
  trackEvent("library_filters", {
    query_length: event.query.trim().length,
    category_count: event.categories.length,
    situation_count: event.situations.length,
    audience_count: event.audiences.length,
    sort: event.sort,
  });
}

export function trackLibraryZeroResult(event: LibraryZeroResultEvent) {
  trackEvent("library_zero_results", {
    query_length: event.query.trim().length,
    category_count: event.categories.length,
    situation_count: event.situations.length,
    audience_count: event.audiences.length,
  });
}

export function trackLibraryPromptCopied(event: LibraryPromptEvent) {
  trackEvent("library_prompt_copied", {
    prompt_id: event.promptId,
    category_id: safeString(event.categoryId),
  });
}

export function trackLibraryQuickLaunch(event: LibraryQuickLaunchEvent) {
  trackEvent("library_quick_launch", {
    prompt_id: event.promptId,
    category_id: safeString(event.categoryId),
    destination: event.destination,
  });
}
