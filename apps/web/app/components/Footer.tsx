import Image from 'next/image';
import Link from 'next/link';

import { FACEBOOK_PAGE_URL } from '@/lib/constants';
import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

export function Footer({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';

  return (
    <footer className="border-t border-slate-200/80 bg-bg-base px-4 py-14">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt={isBn ? 'ParentingMyKid লোগো' : 'ParentingMyKid logo'}
          width={64}
          height={64}
          className="h-16 w-16 rounded-2xl object-contain"
        />
        <p
          className={`mt-4 text-xl font-bold text-text-main ${
            isBn ? 'font-bengali' : ''
          }`}
        >
          {content.footer.tagline}
        </p>
        <p className="mt-2 text-lg font-semibold text-brand-teal">
          www.parentingmykid.com
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold">
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-purple hover:underline"
          >
            Facebook
          </a>
          <Link
            href="/privacy-policy"
            className="text-brand-teal hover:underline"
          >
            {content.footer.privacyLabel}
          </Link>
        </div>
        <p
          className={`mt-8 text-sm text-text-soft ${
            isBn ? 'font-bengali' : ''
          }`}
        >
          {content.footer.rights}
        </p>
      </div>
    </footer>
  );
}
