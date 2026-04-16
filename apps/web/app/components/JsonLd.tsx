type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

function serializeJsonLd(data: Props['data']): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Injects JSON-LD structured data. Safe for server components only.
 */
export function JsonLd({ data }: Props): React.ReactElement {
  const json = serializeJsonLd(data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
