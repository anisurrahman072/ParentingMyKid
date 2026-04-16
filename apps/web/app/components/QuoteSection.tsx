'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import type { LandingContent, QuoteCardPalette } from '@/lib/content';

import { QuoteSectionSky } from './QuoteSectionSky';

type Props = {
  content: LandingContent;
};

const AUTOPLAY_MS = 10_000;

const QUOTE_CARD_THEME: Record<
  QuoteCardPalette,
  {
    shell: string;
    orbA: string;
    orbB: string;
  }
> = {
  'obsidian-teal': {
    shell: 'bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950',
    orbA: 'bg-brand-teal/25',
    orbB: 'bg-brand-purple/30',
  },
  'nocturne-violet': {
    shell: 'bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950/75',
    orbA: 'bg-fuchsia-500/22',
    orbB: 'bg-violet-500/28',
  },
  'midnight-indigo': {
    shell: 'bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950/55',
    orbA: 'bg-sky-400/22',
    orbB: 'bg-indigo-500/30',
  },
  'deep-sequoia': {
    shell: 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950',
    orbA: 'bg-emerald-400/22',
    orbB: 'bg-teal-500/18',
  },
  'velvet-plum': {
    shell: 'bg-gradient-to-br from-rose-950 via-slate-950 to-purple-950/85',
    orbA: 'bg-rose-500/20',
    orbB: 'bg-purple-500/28',
  },
};

export function QuoteSection({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';
  const slides = content.quote.slides;
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [pauseAutoplay, setPauseAutoplay] = useState(false);

  const paginate = useCallback(
    (delta: number) => {
      setDirection(delta);
      setIndex((prev) => (prev + delta + slides.length) % slides.length);
    },
    [slides.length],
  );

  const goTo = useCallback(
    (i: number) => {
      if (i === index) return;
      setDirection(i > index ? 1 : -1);
      setIndex(i);
    },
    [index],
  );

  useEffect(() => {
    if (reduceMotion || pauseAutoplay) return;
    const id = window.setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, pauseAutoplay, slides.length]);

  const slide = slides[index];
  const theme = QUOTE_CARD_THEME[slide.palette];

  const variants = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (dir: number) => ({
          x: dir > 0 ? 64 : dir < 0 ? -64 : 0,
          opacity: 0,
        }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({
          x: dir > 0 ? -48 : dir < 0 ? 48 : 0,
          opacity: 0,
        }),
      };

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-1 md:pb-24 md:pt-2">
      <QuoteSectionSky />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div
          className={`relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition-[background,box-shadow] duration-700 ease-out md:rounded-[2.75rem] ${theme.shell}`}
          onMouseEnter={() => setPauseAutoplay(true)}
          onMouseLeave={() => setPauseAutoplay(false)}
        >
          <div
            aria-hidden
            className={`pointer-events-none absolute -left-24 -top-28 h-[22rem] w-[22rem] rounded-full blur-3xl transition-colors duration-700 ${theme.orbA}`}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute -bottom-20 -right-16 h-[18rem] w-[18rem] rounded-full blur-3xl transition-colors duration-700 ${theme.orbB}`}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,255,255,0.11),transparent_55%)]"
          />

          <div
            aria-hidden
            className="pointer-events-none absolute left-6 top-4 select-none font-quote text-[clamp(6rem,22vw,14rem)] font-semibold leading-none text-white/[0.07] sm:left-10 sm:top-6"
          >
            &ldquo;
          </div>

          <div
            className="relative z-10 px-5 pb-8 pt-12 sm:px-10 sm:pb-9 sm:pt-14 md:px-14 md:pb-10 md:pt-16"
            aria-roledescription="carousel"
            aria-label={isBn ? 'উক্তি বাছাই' : 'Quote carousel'}
          >
            <div className="relative">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={index}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center text-center"
                >
                  <blockquote
                    className={`mx-auto w-full max-w-4xl text-[clamp(1.45rem,3.9vw,2.85rem)] font-semibold leading-[1.14] tracking-[-0.02em] text-[#f8fafc] antialiased [text-shadow:0_2px_40px_rgba(0,0,0,0.35)] ${
                      isBn ? 'font-bengali font-bold tracking-normal' : 'font-quote'
                    }`}
                  >
                    {slide.text}
                  </blockquote>

                  <footer className="mt-6 flex shrink-0 flex-col items-center md:mt-8">
                    <span className="mb-4 h-px w-24 bg-gradient-to-r from-brand-teal via-brand-purple to-brand-pink opacity-90 sm:w-32" />
                    <p className="font-sans text-[0.65rem] font-bold uppercase tracking-[0.38em] text-white/45">
                      {content.quote.attributionPrompt}
                    </p>
                    <div className="mt-4 max-w-lg space-y-2">
                      <cite className="not-italic">
                        <span
                          className={`block text-xl font-bold leading-tight tracking-tight sm:text-2xl ${
                            slide.kind === 'brand'
                              ? 'text-gradient-brand bg-clip-text text-transparent'
                              : 'text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.45)]'
                          } ${!isBn && slide.kind === 'citation' ? 'font-quote' : ''}`}
                        >
                          {slide.author}
                        </span>
                      </cite>
                      {slide.creditLine ? (
                        <p className="font-sans text-sm leading-relaxed text-white/55">{slide.creditLine}</p>
                      ) : null}
                    </div>
                  </footer>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex flex-col items-center gap-4 sm:mt-6">
              <div className="flex items-center gap-3 sm:gap-5">
                <button
                  type="button"
                  onClick={() => paginate(-1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-white/90 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
                  aria-label={isBn ? 'পূর্ববর্তী উক্তি' : 'Previous quote'}
                >
                  ‹
                </button>

                <div
                  className="flex items-center justify-center gap-2"
                  role="tablist"
                  aria-label={isBn ? 'উক্তি নির্বাচন' : 'Choose quote'}
                >
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-current={i === index ? 'true' : undefined}
                      onClick={() => goTo(i)}
                      className={`h-2 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal ${
                        i === index
                          ? 'w-8 bg-gradient-to-r from-brand-teal to-brand-purple'
                          : 'w-2 bg-white/25 hover:bg-white/40'
                      }`}
                      aria-label={
                        isBn ? `উক্তি ${i + 1}, মোট ${slides.length}` : `Quote ${i + 1} of ${slides.length}`
                      }
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => paginate(1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-white/90 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
                  aria-label={isBn ? 'পরবর্তী উক্তি' : 'Next quote'}
                >
                  ›
                </button>
              </div>
              <p className="font-sans text-xs text-white/35">
                {index + 1} / {slides.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
