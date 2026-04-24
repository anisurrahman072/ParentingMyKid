import type { Metadata } from 'next';

import { JsonLd } from '@/app/components/JsonLd';
import { Landing } from '@/app/components/Landing';
import { FACEBOOK_PAGE_URL } from '@/lib/constants';
import { bnContent } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

const canonical = `${SITE_URL}/bn`;

export const metadata: Metadata = {
  title: 'Parenting My Kid — বাবা-মায়েদের জন্য',
  description:
    'শিশুর স্বাস্থ্য, শিক্ষা, আবেগ আর খেলাধুলা—সবকিছু মিলিয়ে পেরেন্টিংয়ের এক সহজ ও সুন্দর যাত্রা।',
  alternates: {
    canonical,
    languages: {
      en: `${SITE_URL}/en`,
      bn: `${SITE_URL}/bn`,
      'x-default': `${SITE_URL}/en`,
    },
  },
  openGraph: {
    title: 'Parenting My Kid — বাবা-মায়েদের জন্য',
    description:
      'শিশুর স্বাস্থ্য, শিক্ষা, আবেগ আর খেলাধুলা—সবকিছু মিলিয়ে পেরেন্টিংয়ের এক সহজ ও সুন্দর যাত্রা।',
    url: canonical,
    siteName: 'ParentingMyKid',
    locale: 'bn_BD',
    alternateLocale: ['en_US'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Parenting My Kid — বাবা-মায়েদের জন্য',
    description:
      'শিশুর স্বাস্থ্য, শিক্ষা, আবেগ আর খেলাধুলা—সবকিছু মিলিয়ে পেরেন্টিংয়ের এক সহজ ও সুন্দর যাত্রা।',
  },
};

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${canonical}#webpage`,
  url: canonical,
  name: 'Parenting My Kid — বাবা-মায়েদের জন্য',
  description:
    'শিশুর স্বাস্থ্য, শিক্ষা, আবেগ আর খেলাধুলা—সবকিছু মিলিয়ে পেরেন্টিংয়ের এক সহজ ও সুন্দর যাত্রা।',
  inLanguage: 'bn',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/logo.png`,
  },
  significantLink: FACEBOOK_PAGE_URL,
};

export default function BanglaPage(): React.ReactElement {
  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <Landing content={bnContent} />
    </>
  );
}
