/**
 * Country list + flag emoji for the newsletter country combobox.
 * Uses `Intl` when available; falls back to a static ISO-3166 alpha-2 list.
 */

const ISO2 = /^[A-Z]{2}$/;

/** Unicode regional indicator symbols → flag emoji */
export function countryCodeToFlagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!ISO2.test(cc)) return '🏳️';
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
}

function supportedRegionCodes(): string[] | null {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    if (typeof intl.supportedValuesOf !== 'function') return null;
    return intl
      .supportedValuesOf('region')
      .filter((c) => ISO2.test(c) && c !== 'ZZ');
  } catch {
    return null;
  }
}

/**
 * Fallback when `Intl.supportedValuesOf('region')` is missing (very old runtimes).
 * Covers all ISO 3166-1 alpha-2 countries commonly used; trimmed for bundle size vs completeness.
 */
const FALLBACK_REGION_CODES: readonly string[] = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
];

export type CountryOption = { code: string; name: string; nameEn: string };

export function buildCountryOptions(locale: 'bn' | 'en'): CountryOption[] {
  const codes = supportedRegionCodes() ?? [...FALLBACK_REGION_CODES];
  const locPrimary = locale === 'bn' ? 'bn' : 'en';
  const dnPrimary = new Intl.DisplayNames([locPrimary, 'en'], { type: 'region' });
  const dnEn = new Intl.DisplayNames(['en'], { type: 'region' });

  const mapped: CountryOption[] = [];
  const seen = new Set<string>();
  for (const code of codes) {
    if (seen.has(code)) continue;
    seen.add(code);
    mapped.push({
      code,
      name: dnPrimary.of(code) ?? code,
      nameEn: dnEn.of(code) ?? code,
    });
  }

  const bd = mapped.find((m) => m.code === 'BD');
  const rest = mapped
    .filter((m) => m.code !== 'BD')
    .sort((a, b) => a.name.localeCompare(b.name, locPrimary, { sensitivity: 'base' }));

  if (bd) return [bd, ...rest];
  return mapped.sort((a, b) => a.name.localeCompare(b.name, locPrimary, { sensitivity: 'base' }));
}

export function filterCountryOptions(options: CountryOption[], query: string): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => {
    const code = o.code.toLowerCase();
    return (
      code.includes(q) ||
      o.name.toLowerCase().includes(q) ||
      o.nameEn.toLowerCase().includes(q)
    );
  });
}
