const NAME_PATTERN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
const DATE_PATTERN = /\b(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{2,4})?)\b/gi;
const LONG_NUMBER_PATTERN = /\b\d{4,}\b/g;

const REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: DATE_PATTERN, replacement: "[date]" },
  { pattern: LONG_NUMBER_PATTERN, replacement: "[number]" },
];

const COMMON_WORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "this",
  "that",
  "when",
  "have",
  "pain",
  "ache",
  "left",
  "right",
  "back",
  "chest",
  "head",
  "abdomen",
  "stomach",
  "shortness",
  "breath",
  "fever",
  "nausea",
  "vomiting",
]);

export const sanitizeFreeText = (value: string): string => {
  if (!value) {
    return value;
  }

  let sanitized = value;

  REPLACEMENTS.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });

  sanitized = sanitized.replace(NAME_PATTERN, (match) => {
    const lower = match.toLowerCase();
    if (COMMON_WORDS.has(lower)) {
      return match;
    }

    // Preserve pronouns and days of week by skipping replacements when they look generic.
    if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(match)) {
      return match;
    }

    if (/^(he|she|they|him|her|them|his|hers|their)$/i.test(match)) {
      return match;
    }

    return "[name]";
  });

  return sanitized;
};
