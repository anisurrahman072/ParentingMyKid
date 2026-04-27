/** "Anis Rahman's Family" / "Anis Rahman" → tokens without trailing …'s on a segment. */
export function nameTokensForFamilyCard(raw: string): string[] {
  let t = raw.trim();
  if (!t) return [];
  if (/\bfamily\b/i.test(t)) {
    t = t.replace(/\s+Family\s*$/i, '').trim();
  }
  return t
    .split(/\s+/)
    .map((w) => w.replace(/'s$|'$/i, ''))
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

function titleCaseName(word: string): string {
  if (!word.length) return word;
  return word[0]!.toUpperCase() + word.slice(1);
}

/**
 * Compact label: first name token + "'s Family". Handles full titles like "Anis Rahman's Family"
 * or "Anis Rahman" → "Anis's Family".
 */
export function possessiveShortFamilyTitle(familyName: string): string {
  const words = nameTokensForFamilyCard(familyName);
  if (words.length === 0) return 'Your family';
  return `${titleCaseName(words[0]!)}'s Family`;
}
