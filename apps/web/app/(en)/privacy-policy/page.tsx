import type { Metadata } from 'next';
import Link from 'next/link';

import { JsonLd } from '@/app/components/JsonLd';
import { FACEBOOK_PAGE_URL } from '@/lib/constants';
import { SITE_URL } from '@/lib/site';

const canonical = `${SITE_URL}/privacy-policy`;

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How ParentingMyKid handles information when you use our website and Facebook page.',
  alternates: {
    canonical,
  },
  openGraph: {
    title: 'Privacy Policy | ParentingMyKid',
    description:
      'How ParentingMyKid handles information when you use our website and Facebook page.',
    url: canonical,
    siteName: 'ParentingMyKid',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | ParentingMyKid',
    description:
      'How ParentingMyKid handles information when you use our website and Facebook page.',
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${SITE_URL}/en`,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Privacy Policy',
      item: canonical,
    },
  ],
};

export default function PrivacyPolicyPage(): React.ReactElement {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <main className="min-h-screen bg-bg-base px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-text-soft">
            <Link
              href="/"
              className="text-brand-teal underline decoration-2 underline-offset-4 hover:text-brand-purple"
            >
              ← Home
            </Link>
          </p>

          <h1 className="mt-8 font-quote text-3xl font-bold tracking-tight text-text-main md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-text-soft">Last updated: April 16, 2026</p>

          <div className="mt-10 max-w-none space-y-8 text-[17px] leading-relaxed text-text-main">
            <section className="space-y-3">
              <h2 className="font-quote text-xl font-semibold text-text-main">1. Who we are</h2>
              <p className="text-text-main/95">
                This policy describes ParentingMyKid (“we,” “us”) and our website at{' '}
                <span className="whitespace-nowrap">www.parentingmykid.com</span> (the “Site”). We
                share parenting ideas and community content through our public Facebook page and
                this Site.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-quote text-xl font-semibold text-text-main">
                2. What we collect on this Site
              </h2>
              <p className="text-text-main/95">
                <strong>
                  We do not run accounts, sign-ups, or forms on this Site for collecting personal
                  data.
                </strong>{' '}
                We are not asking you to give us your name, email, phone number, or child’s
                information through this website.
              </p>
              <p className="text-text-main/95">
                Like most websites, our hosting and infrastructure may process{' '}
                <strong>technical data automatically</strong> when you visit (for example, IP
                address, browser type, and general region). We use this only to operate and secure
                the Site (for example, routing you to the right language version where applicable)
                and not to build a personal profile about you on our own systems.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-quote text-xl font-semibold text-text-main">3. Facebook page</h2>
              <p className="text-text-main/95">
                Our Facebook page is hosted by <strong>Meta</strong>. If you follow, comment on, or
                interact with our page or posts, Meta processes information according to{' '}
                <a
                  href="https://www.facebook.com/privacy/policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-teal underline decoration-2 underline-offset-2 hover:text-brand-purple"
                >
                  Meta’s Privacy Policy
                </a>
                . We do not receive your private messages through this Site simply because you
                visited our website.
              </p>
              <p className="text-text-main/95">
                The Site may display <strong>recent public posts</strong> from our Facebook page
                (for example, text and images that are already public on Facebook). That content is
                shown for convenience; it remains subject to Meta’s platform rules and privacy
                terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-quote text-xl font-semibold text-text-main">
                4. Cookies and similar technologies
              </h2>
              <p className="text-text-main/95">
                We aim to keep tracking minimal. Any cookies or local storage used by the Site are
                primarily for basic functionality (such as how the site loads). If we use analytics
                or similar tools in the future, we will update this policy and, where required, your
                choices.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-quote text-xl font-semibold text-text-main">
                5. Children’s privacy
              </h2>
              <p className="text-text-main/95">
                Our content is for parents and caregivers. The Site is not intended to collect
                personal information from children. If you believe we have inadvertently received
                information about a child, please contact us (see below) and we will take appropriate
                steps.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-quote text-xl font-semibold text-text-main">
                6. International visitors
              </h2>
              <p className="text-text-main/95">
                Visitors may access the Site from different countries. By using the Site, you
                understand that technical data needed to serve the Site may be processed where our
                service providers operate, in line with this policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-quote text-xl font-semibold text-text-main">7. Changes</h2>
              <p className="text-text-main/95">
                We may update this Privacy Policy from time to time. The “Last updated” date at the
                top will change when we do. Continued use of the Site after changes means you accept
                the updated policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-quote text-xl font-semibold text-text-main">8. Contact</h2>
              <p className="text-text-main/95">
                For questions about this policy or our data practices, you can reach us through our
                public{' '}
                <a
                  href={FACEBOOK_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-teal underline decoration-2 underline-offset-2 hover:text-brand-purple"
                >
                  Facebook page
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
