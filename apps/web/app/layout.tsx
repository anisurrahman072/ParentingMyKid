import type { Metadata, Viewport } from 'next';
import { Fraunces, Nunito, Noto_Sans_Bengali } from 'next/font/google';
import { headers } from 'next/headers';

import { JsonLd } from '@/app/components/JsonLd';
import { FACEBOOK_PAGE_URL } from '@/lib/constants';
import { SITE_NAME, SITE_URL, TWITTER_HANDLE } from '@/lib/site';

import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00A878',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Warm, practical parenting ideas—health, learning, emotions, play, and family connection.',
  keywords: [
    'parenting',
    'child development',
    'raising kids',
    'family',
    'parenting tips',
    'child health',
    'emotional intelligence',
    'play based learning',
    'Bengali parenting',
    'ParentingMyKid',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  category: 'Parenting',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    alternateLocale: ['bn_BD'],
    url: SITE_URL,
    title: SITE_NAME,
    description:
      'Warm, practical parenting ideas—health, learning, emotions, play, and family connection.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — warm, practical parenting ideas`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: TWITTER_HANDLE,
    creator: TWITTER_HANDLE,
    title: SITE_NAME,
    description:
      'Warm, practical parenting ideas—health, learning, emotions, play, and family connection.',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/logo.png`,
  },
  sameAs: [FACEBOOK_PAGE_URL],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: ['en', 'bn'],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const h = await headers();
  const lang = h.get('x-document-lang') ?? 'en';

  return (
    <html
      lang={lang}
      className={`${nunito.variable} ${fraunces.variable} ${notoBengali.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-x-hidden font-sans" suppressHydrationWarning>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        {children}
      </body>
    </html>
  );
}
