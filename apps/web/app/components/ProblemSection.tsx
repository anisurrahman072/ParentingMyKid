'use client';

import { motion, useReducedMotion } from 'framer-motion';

import type { LandingContent } from '@/lib/content';

import { ProblemKidMascot } from './ProblemKidMascot';
import { ScrollReveal } from './ScrollReveal';

const cardSpring = { type: 'spring' as const, stiffness: 380, damping: 28, mass: 0.85 };

type Props = {
  content: LandingContent;
};

const cardStyles = [
  {
    shell:
      'border-emerald-200/65 bg-gradient-to-br from-emerald-50/98 via-white/95 to-teal-50/75 shadow-[0_12px_40px_-12px_rgba(5,150,105,0.18)] ring-1 ring-emerald-900/[0.04]',
    bar: 'from-emerald-400 via-brand-teal to-teal-500',
    iconWrap:
      'bg-gradient-to-br from-emerald-100/95 to-teal-50/90 text-emerald-900 ring-2 ring-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
    hoverGlow:
      'group-hover:shadow-[0_16px_48px_-14px_rgba(5,150,105,0.22)] group-hover:border-emerald-300/55 group-hover:ring-emerald-400/20',
  },
  {
    shell:
      'border-rose-200/60 bg-gradient-to-br from-rose-50/98 via-white/95 to-amber-50/70 shadow-[0_12px_40px_-12px_rgba(225,29,72,0.12)] ring-1 ring-rose-900/[0.04]',
    bar: 'from-rose-400 via-amber-400 to-orange-300',
    iconWrap:
      'bg-gradient-to-br from-rose-100/95 to-amber-50/85 text-rose-900 ring-2 ring-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
    hoverGlow:
      'group-hover:shadow-[0_16px_48px_-14px_rgba(225,29,72,0.16)] group-hover:border-rose-300/50 group-hover:ring-rose-300/22',
  },
  {
    shell:
      'border-violet-200/60 bg-gradient-to-br from-violet-50/98 via-white/95 to-fuchsia-50/72 shadow-[0_12px_40px_-12px_rgba(124,58,237,0.14)] ring-1 ring-violet-900/[0.04]',
    bar: 'from-violet-400 via-brand-purple to-fuchsia-500',
    iconWrap:
      'bg-gradient-to-br from-violet-100/95 to-fuchsia-50/85 text-violet-900 ring-2 ring-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
    hoverGlow:
      'group-hover:shadow-[0_16px_48px_-14px_rgba(124,58,237,0.18)] group-hover:border-violet-300/50 group-hover:ring-violet-300/22',
  },
] as const;

export function ProblemSection({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-x-clip bg-bg-base px-4 py-20">
      <div
        className="absolute inset-0 -skew-y-2 overflow-hidden bg-gradient-to-br from-amber-50/90 via-white to-rose-50/80"
        aria-hidden
      />
      {/* Static decorative blobs — no animation so blur-3xl never forces a repaint */}
      <div
        className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-brand-teal/10 opacity-50 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-32 h-80 w-80 rounded-full bg-brand-purple/10 opacity-45 blur-3xl"
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

        <div className="relative mt-12 max-md:mt-20">
          {/* Cartoon upset kid (SVG + motion): sibling of the panel so it is not clipped; narrow screens = strip above cards */}
          <div className="pointer-events-none relative z-[3] mx-auto mb-6 flex w-[min(8.5rem,48vw)] max-w-full shrink-0 justify-center max-md:pt-2 md:absolute md:mb-0 md:pt-0 md:left-0 md:top-[38%] md:w-[min(12.5rem,34vw)] md:max-w-[13.5rem] md:-translate-x-[min(7.5rem,20vw)] md:-translate-y-1/2 lg:top-[36%] lg:w-[min(13.5rem,32vw)] lg:-translate-x-[min(9rem,22vw)]">
            <ProblemKidMascot
              bubbleText={content.problem.mascotBubble}
              bubbleFollowupText={content.problem.mascotBubbleFollowup}
              isBn={isBn}
              className="w-full max-w-none"
            />
          </div>

          <motion.div
            className="relative z-[1] overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/[0.04] sm:bg-white/55 sm:backdrop-blur-md sm:rounded-[2.25rem] sm:p-7 md:rounded-[2.5rem] md:p-9"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          >
            {/* background-position animation is not compositor-safe; enable only on sm+ */}
            <div
              className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] bg-[linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.5)_50%,transparent_60%)] bg-[length:220%_100%] opacity-40 ${reduceMotion ? '' : 'sm:animate-problem-shell'}`}
              aria-hidden
            />
            <div className="relative grid gap-5 sm:grid-cols-3 sm:gap-6">
              {content.problem.cards.map((card, i) => {
                const palette = cardStyles[i % cardStyles.length];
                return (
                  <motion.article
                    key={card.title}
                    initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.97 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: '-12%' }}
                    transition={{
                      ...cardSpring,
                      delay: 0.08 + i * 0.1,
                    }}
                    whileHover={
                      reduceMotion
                        ? undefined
                        : {
                            y: -8,
                            scale: 1.02,
                            transition: { type: 'spring', stiffness: 420, damping: 22 },
                          }
                    }
                    whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                    className={`group relative overflow-hidden rounded-3xl border p-6 text-center transition-[box-shadow,border-color,transform] duration-300 sm:p-7 sm:backdrop-blur-xl ${palette.shell} ${palette.hoverGlow}`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 z-[1] h-[3px] bg-gradient-to-r opacity-95 ${palette.bar}`}
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute -inset-px z-0 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background:
                          'linear-gradient(145deg, rgba(255,255,255,0.55) 0%, transparent 42%, rgba(255,255,255,0.2) 100%)',
                      }}
                      aria-hidden
                    />
                    <div className="relative z-[2]">
                      <motion.div
                        className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl text-[2.35rem] leading-none drop-shadow-sm ${palette.iconWrap}`}
                        aria-hidden
                        whileHover={
                          reduceMotion
                            ? undefined
                            : {
                                scale: 1.08,
                                rotate: [0, -5, 5, 0],
                                transition: { duration: 0.45, ease: 'easeOut' },
                              }
                        }
                      >
                        {card.emoji}
                      </motion.div>
                      <h3
                        className={`mt-5 text-xl font-bold text-text-main transition-colors duration-300 group-hover:text-slate-900 ${
                          isBn ? 'font-bengali' : ''
                        }`}
                      >
                        {card.title}
                      </h3>
                      <p
                        className={`mt-3 text-base leading-relaxed text-text-soft transition-colors duration-300 group-hover:text-slate-600 ${
                          isBn ? 'font-bengali' : ''
                        }`}
                      >
                        {card.body}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
