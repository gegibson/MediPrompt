// Lightweight client-side PHI guard for obvious identifiers.
// Detects: dates (MM/DD/YYYY or MM-DD-YYYY), long numbers (8+ digits), and likely names via common phrases.

export type PhiIssueType = "date" | "long_number" | "name";

export type PhiIssue = {
  type: PhiIssueType;
  match: string;
  index: number;
};

export type PhiScanResult = {
  flagged: boolean;
  issues: PhiIssue[];
  counts: Record<PhiIssueType, number> & { total: number };
};

const DATE_REGEX = /\b(?:0?[1-9]|1[0-2])[\/-](?:0?[1-9]|[12][0-9]|3[01])[\/-](?:19|20)\d{2}\b/g; // MM/DD/YYYY or MM-DD-YYYY
const LONG_NUMBER_REGEX = /\b\d{8,}\b/g; // 8+ consecutive digits

// Name heuristics (conservative):
// - Phrases like "my name is John Doe", "patient John Doe", "this is Jane Doe"
// - Titles like Dr./Mr./Ms. followed by capitalized word(s)
// These are intentionally scoped to reduce false positives.
const NAME_PHRASE_REGEX = new RegExp(
  String.raw`\b(?:my\s+name\s+is|i\s+am|this\s+is|patient|name[:\s]+|son\s+is|daughter\s+is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b`,
  "gi",
);
const NAME_TITLE_REGEX = /\b(?:Dr|Mr|Mrs|Ms)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g; // Dr. Jane Doe, Mr John

function collectMatches(text: string, regex: RegExp, type: PhiIssueType): PhiIssue[] {
  const issues: PhiIssue[] = [];
  regex.lastIndex = 0; // ensure fresh scan
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    issues.push({ type, match: match[0], index: match.index });
    // Safeguard against zero-width loops
    if (match.index === regex.lastIndex) regex.lastIndex++;
  }
  return issues;
}

export function detectPhi(textInput: string | null | undefined): PhiScanResult {
  const text = (textInput || "").trim();
  if (!text) {
    return {
      flagged: false,
      issues: [],
      counts: { date: 0, long_number: 0, name: 0, total: 0 },
    };
  }

  const issues: PhiIssue[] = [];
  issues.push(...collectMatches(text, DATE_REGEX, "date"));
  issues.push(...collectMatches(text, LONG_NUMBER_REGEX, "long_number"));

  // Names via phrases
  NAME_PHRASE_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NAME_PHRASE_REGEX.exec(text)) !== null) {
    const full = m[0];
    issues.push({ type: "name", match: full, index: m.index });
    if (m.index === NAME_PHRASE_REGEX.lastIndex) NAME_PHRASE_REGEX.lastIndex++;
  }

  // Names via titles
  issues.push(...collectMatches(text, NAME_TITLE_REGEX, "name"));

  const counts = issues.reduce(
    (acc, issue) => {
      acc[issue.type] += 1;
      acc.total += 1;
      return acc;
    },
    { date: 0, long_number: 0, name: 0, total: 0 } as Record<PhiIssueType, number> & {
      total: number;
    },
  );

  return { flagged: issues.length > 0, issues, counts };
}

export function buildWarningMessage(result: PhiScanResult): string {
  if (!result.flagged) return "";
  const parts: string[] = [];
  if (result.counts.name) parts.push(`${result.counts.name} name${result.counts.name > 1 ? "s" : ""}`);
  if (result.counts.date) parts.push(`${result.counts.date} date${result.counts.date > 1 ? "s" : ""}`);
  if (result.counts.long_number)
    parts.push(`${result.counts.long_number} long number${result.counts.long_number > 1 ? "s" : ""}`);
  const summary = parts.length ? parts.join(", ") : "possible identifiers";
  return `We found ${summary}. Remove personal identifiers like names, full dates, and record numbers.`;
}

