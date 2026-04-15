'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

import { FACEBOOK_PAGE_URL } from '@/lib/constants';
import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

export function ImageShowcase({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';

  return (
    <section className="bg-bg-base px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="relative flex min-h-[280px] flex-col items-center justify-center gap-8 md:min-h-[360px] md:flex-row md:gap-4">
          <motion.div
            initial={{ opacity: 0, rotate: -6, y: 40 }}
            whileInView={{ opacity: 1, rotate: -2, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 80 }}
            className="relative z-20 w-full max-w-md -rotate-2 shadow-2xl shadow-brand-teal/20 md:max-w-lg"
          >
            <Image
              src="/banner-1.png"
              alt=""
              width={900}
              height={500}
              className="rounded-3xl border-4 border-white object-cover"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, rotate: 6, y: 40 }}
            whileInView={{ opacity: 1, rotate: 2, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 80, delay: 0.08 }}
            className="relative z-10 w-full max-w-md rotate-2 shadow-2xl shadow-brand-purple/25 md:absolute md:right-4 md:top-12 md:max-w-lg"
          >
            <Image
              src="/banner-2.png"
              alt=""
              width={900}
              height={500}
              className="rounded-3xl border-4 border-white object-cover"
            />
          </motion.div>
        </div>
        <p
          className={`mt-12 text-center text-lg text-text-soft ${
            isBn ? 'font-bengali' : ''
          }`}
        >
          {content.showcase.caption}{' '}
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brand-teal underline decoration-2 underline-offset-4 hover:text-brand-purple"
          >
            {content.showcase.linkLabel}
          </a>
        </p>
      </div>
    </section>
  );
}
