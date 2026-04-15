'use client';

import { motion } from 'framer-motion';

import type { LandingContent } from '@/lib/content';

import { ScrollReveal } from './ScrollReveal';

type Props = {
  content: LandingContent;
};

export function ProblemSection({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';

  return (
    <section className="relative overflow-hidden bg-bg-base px-4 py-20">
      <div
        className="absolute inset-0 -skew-y-2 bg-gradient-to-br from-amber-50/90 via-white to-rose-50/80"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-5xl">
        <ScrollReveal>
          <h2
            className={`text-center text-3xl font-black leading-snug text-text-main sm:text-4xl md:text-5xl ${
              isBn ? 'font-bengali' : ''
            }`}
          >
            {content.problem.title}
          </h2>
        </ScrollReveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {content.problem.cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="glass-panel p-6 text-center shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="text-5xl drop-shadow-sm">{card.emoji}</div>
              <h3
                className={`mt-4 text-xl font-bold text-text-main ${
                  isBn ? 'font-bengali' : ''
                }`}
              >
                {card.title}
              </h3>
              <p
                className={`mt-3 text-base leading-relaxed text-text-soft ${
                  isBn ? 'font-bengali' : ''
                }`}
              >
                {card.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
