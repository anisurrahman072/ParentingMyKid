/**
 * Route group for English-language URLs (/en, /privacy-policy).
 * Locale-specific document language is set on `<html>` in the root layout via middleware (`x-document-lang`).
 */
export default function EnglishRouteGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return <>{children}</>;
}
