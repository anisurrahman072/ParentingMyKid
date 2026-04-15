'use client';

import type { LandingContent } from '@/lib/content';

import { ScrollReveal } from './ScrollReveal';

type Props = {
  content: LandingContent;
};

export function QuoteSection({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';

  return (
    <section className="relative overflow-hidden px-4 py-20">
      <div className="absolute inset-0 rounded-none bg-gradient-to-br from-emerald-50 via-teal-50/90 to-violet-50 md:rounded-[3rem]" />
      <div className="pointer-events-none absolute left-8 top-10 text-[10rem] font-serif leading-none text-brand-teal/10 sm:left-16">
        &ldquo;
      </div>
      <ScrollReveal className="relative z-10 mx-auto max-w-4xl px-2 text-center">
        <blockquote
          className={`text-2xl font-black leading-snug text-text-main sm:text-3xl md:text-4xl ${
            isBn ? 'font-bengali' : ''
          }`}
        >
          {content.quote.text}
        </blockquote>
        <footer className="mt-8 text-lg font-bold text-brand-purple">
          — {content.quote.attribution}
        </footer>
      </ScrollReveal>
    </section>
  );
}
