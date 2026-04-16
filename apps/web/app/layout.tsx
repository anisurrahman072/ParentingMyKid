import type { Metadata } from 'next';
import { Fraunces, Nunito, Noto_Sans_Bengali } from 'next/font/google';

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

export const metadata: Metadata = {
  title: {
    default: 'ParentingMyKid',
    template: '%s | ParentingMyKid',
  },
  description:
    'Warm, practical parenting ideas—health, learning, emotions, play, and family connection.',
  metadataBase: new URL('https://www.parentingmykid.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fraunces.variable} ${notoBengali.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen overflow-x-hidden font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
