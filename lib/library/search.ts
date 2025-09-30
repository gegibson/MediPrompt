import type { PromptIndexItem } from "./types";

export type HighlightRange = { start: number; end: number };
export type FieldHighlights = {
  title?: HighlightRange[];
  shortDescription?: HighlightRange[];
};

export type SearchHit = {
  item: PromptIndexItem;
  score: number;
  highlights: FieldHighlights;
};

export type SearchWeights = {
  title: number;
  shortDescription: number;
  tags: number;
  keywords: number;
};

export type SearchOptions = {
  weights?: Partial<SearchWeights>;
  threshold?: number; // minimum score to include
  maxResults?: number;
};

export const DEFAULT_WEIGHTS: SearchWeights = {
  title: 5,
  shortDescription: 2,
  tags: 1.5,
  keywords: 2.5,
};

export const DEFAULT_OPTIONS: Required<SearchOptions> = {
  weights: DEFAULT_WEIGHTS,
  threshold: 1.0,
  maxResults: 50,
};

function norm(s: string): string {
  return s.toLowerCase();
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9+#]+/i)
    .filter(Boolean);
}

function addHighlight(ranges: HighlightRange[], start: number, end: number) {
  if (start < 0 || end <= start) return;
  // merge overlapping ranges for cleanliness
  const next: HighlightRange[] = [];
  let placed = false;
  for (const r of ranges) {
    if (end < r.start) {
      if (!placed) {
        next.push({ start, end });
        placed = true;
      }
      next.push(r);
    } else if (start > r.end) {
      next.push(r);
    } else {
      // overlap
      const ns = Math.min(start, r.start);
      const ne = Math.max(end, r.end);
      start = ns;
      end = ne;
    }
  }
  if (!placed) next.push({ start, end });
  ranges.splice(0, ranges.length, ...next);
}

function wordStarts(text: string, token: string): number {
  // find a word boundary where word starts with token
  const re = new RegExp(`\\b${escapeRegExp(token)}`, "i");
  const m = text.match(re);
  return m && typeof m.index === "number" ? m.index : -1;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function isSubsequence(haystack: string, needle: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

export function searchIndex(
  items: PromptIndexItem[],
  query: string,
  options?: SearchOptions,
): SearchHit[] {
  const opts: Required<SearchOptions> = { ...DEFAULT_OPTIONS, ...(options ?? {}), weights: { ...DEFAULT_WEIGHTS, ...(options?.weights ?? {}) } };
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    // No query: return top featured/newest by a simple heuristic using weights
    return items
      .map((item) => ({ item, score: (item.featuredWeight ?? 0) * 0.1, highlights: {} as FieldHighlights }))
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.maxResults);
  }

  const hits: SearchHit[] = [];

  for (const item of items) {
    const title = norm(item.title);
    const desc = norm(item.shortDescription);
    const tags = (item.tags ?? []).map(norm);
    const keywords = (item.keywords ?? []).map(norm);

    let score = 0;
    const hlTitle: HighlightRange[] = [];
    const hlDesc: HighlightRange[] = [];

    for (const t of tokens) {
      // Title scoring + highlights
      let matched = false;
      let pos = title.indexOf(t);
      if (pos >= 0) {
        score += opts.weights.title;
        addHighlight(hlTitle, pos, pos + t.length);
        matched = true;
      } else {
        pos = wordStarts(title, t);
        if (pos >= 0) {
          score += opts.weights.title * 0.7;
          addHighlight(hlTitle, pos, pos + t.length);
          matched = true;
        } else if (t.length >= 3 && isSubsequence(title, t)) {
          score += opts.weights.title * 0.4;
          matched = true;
        }
      }

      // Description scoring + highlights
      let posd = desc.indexOf(t);
      if (posd >= 0) {
        score += opts.weights.shortDescription;
        addHighlight(hlDesc, posd, posd + t.length);
        matched = true;
      } else {
        posd = wordStarts(desc, t);
        if (posd >= 0) {
          score += opts.weights.shortDescription * 0.7;
          addHighlight(hlDesc, posd, posd + t.length);
          matched = true;
        } else if (!matched && t.length >= 3 && isSubsequence(desc, t)) {
          score += opts.weights.shortDescription * 0.3;
          matched = true;
        }
      }

      // Tags and keywords (no highlights to keep payload small)
      if (tags.some((tag) => tag.includes(t))) {
        score += opts.weights.tags;
        matched = true;
      } else if (tags.some((tag) => tag.startsWith(t))) {
        score += opts.weights.tags * 0.6;
        matched = true;
      }

      if (keywords.some((kw) => kw.includes(t))) {
        score += opts.weights.keywords;
        matched = true;
      } else if (keywords.some((kw) => kw.startsWith(t))) {
        score += opts.weights.keywords * 0.6;
        matched = true;
      }

      // If nothing matched this token at all, lightly penalize
      if (!matched) {
        score -= 0.15;
      }
    }

    if (score >= opts.threshold) {
      hits.push({ item, score, highlights: { title: hlTitle, shortDescription: hlDesc } });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  if (hits.length > opts.maxResults) hits.length = opts.maxResults;
  return hits;
}

