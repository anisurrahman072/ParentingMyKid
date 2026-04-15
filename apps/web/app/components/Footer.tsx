import Image from 'next/image';

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
          alt=""
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
        <a
          href={FACEBOOK_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 text-sm font-semibold text-brand-purple hover:underline"
        >
          Facebook
        </a>
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
