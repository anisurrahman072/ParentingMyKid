'use client';

import { FacebookFollowButton } from './FacebookFollowButton';
import { FloatingEmojis } from './FloatingEmojis';

import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

export function FacebookCTA({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';

  return (
    <section className="relative overflow-hidden px-4 py-24 mesh-cta">
      <FloatingEmojis />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2
          className={`text-4xl font-black text-text-main sm:text-5xl ${
            isBn ? 'font-bengali' : ''
          }`}
        >
          {content.community.title}
        </h2>
        <p
          className={`mt-6 text-xl leading-relaxed text-text-soft ${
            isBn ? 'font-bengali' : ''
          }`}
        >
          {content.community.body}
        </p>
        <div className="mt-10 flex justify-center">
          <FacebookFollowButton label={content.community.cta} size="xl" />
        </div>
      </div>
    </section>
  );
}
