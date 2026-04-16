import type { Metadata } from 'next';

import { JsonLd } from '@/app/components/JsonLd';
import { Landing } from '@/app/components/Landing';
import { FACEBOOK_PAGE_URL } from '@/lib/constants';
import { enContent } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

const canonical = `${SITE_URL}/en`;

export const metadata: Metadata = {
  title: 'Parenting My Kid — For parents',
  description:
    'Your child’s health, learning, emotional steadiness, and play—one warm, easy-to-follow path for parents.',
  alternates: {
    canonical,
    languages: {
      en: `${SITE_URL}/en`,
      bn: `${SITE_URL}/bn`,
      'x-default': `${SITE_URL}/en`,
    },
  },
  openGraph: {
    title: 'Parenting My Kid — For parents',
    description:
      'Your child’s health, learning, emotional steadiness, and play—one warm, easy-to-follow path for parents.',
    url: canonical,
    siteName: 'ParentingMyKid',
    locale: 'en_US',
    alternateLocale: ['bn_BD'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Parenting My Kid — For parents',
    description:
      'Your child’s health, learning, emotional steadiness, and play—one warm, easy-to-follow path for parents.',
  },
};

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${canonical}#webpage`,
  url: canonical,
  name: 'Parenting My Kid — For parents',
  description:
    'Your child’s health, learning, emotional steadiness, and play—one warm, easy-to-follow path for parents.',
  inLanguage: 'en',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/logo.png`,
  },
  significantLink: FACEBOOK_PAGE_URL,
};

export default function EnglishPage(): React.ReactElement {
  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <Landing content={enContent} />
    </>
  );
}
