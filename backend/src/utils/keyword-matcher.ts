/**
 * Lower-cases text and folds curly/typographic apostrophes and quotes to
 * their straight forms, so "I Don’t" and "i don't" compare equal.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛′ʼ]/g, "'")
    .replace(/[“”‟″]/g, '"');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a whole-word, case-insensitive matcher for a phrase. Internal
 * whitespace matches any run of whitespace, so "die" matches "I wan die"
 * but not "diet" or "studied".
 */
function buildPattern(keyword: string): RegExp {
  const body = normalizeText(keyword)
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+");
  return new RegExp(`(?<![\\w'])${body}(?![\\w'])`);
}

const patternCache = new Map<string, RegExp>();

function patternFor(keyword: string): RegExp {
  let pattern = patternCache.get(keyword);
  if (!pattern) {
    pattern = buildPattern(keyword);
    patternCache.set(keyword, pattern);
  }
  return pattern;
}

/** Returns the keywords that appear in the message as whole words. */
export function findKeywords(message: string, keywords: string[]): string[] {
  const normalized = normalizeText(message);
  return keywords.filter((keyword) => patternFor(keyword).test(normalized));
}

/** True if any keyword appears in the message as a whole word. */
export function containsAnyKeyword(
  message: string,
  keywords: string[],
): boolean {
  const normalized = normalizeText(message);
  return keywords.some((keyword) => patternFor(keyword).test(normalized));
}
