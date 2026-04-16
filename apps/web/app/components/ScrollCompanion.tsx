'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

const CHAPTER_SELECTOR = '[data-scroll-chapter]';

export function ScrollCompanion({ content }: Props): React.ReactElement {
  const lines = content.scrollCompanion;
  const isBn = content.locale === 'bn';
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  /** Closed only after ×; always starts open on each mount so the dialog shows immediately. */
  const [bubbleOpen, setBubbleOpen] = useState(true);

  const bindObserver = useCallback(() => {
    const nodes = Array.from(document.querySelectorAll(CHAPTER_SELECTOR));
    if (nodes.length === 0) return undefined;

    let rafId = 0;

    const pickActive = (): void => {
      const vh = window.innerHeight;
      const mid = vh * 0.42;
      let bestIdx = 0;
      let best = -Infinity;
      nodes.forEach((node) => {
        const el = node as HTMLElement;
        const idx = Number(el.dataset.scrollChapter);
        if (Number.isNaN(idx) || idx < 0 || idx >= lines.length) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (visible <= 0) return;
        const center = (r.top + r.bottom) / 2;
        const score = visible - Math.abs(center - mid);
        if (score > best) {
          best = score;
          bestIdx = idx;
        }
      });
      setActive((prev) => (prev === bestIdx ? prev : bestIdx));
    };

    const schedulePick = (): void => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        pickActive();
      });
    };

    const observer = new IntersectionObserver(schedulePick, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: '-8% 0px -12% 0px',
    });

    nodes.forEach((n) => observer.observe(n));
    pickActive();

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [lines]);

  useEffect(() => {
    const cleanup = bindObserver();
    return cleanup;
  }, [bindObserver]);

  const line = lines[Math.min(active, lines.length - 1)] ?? '';

  const closeBubble = (): void => {
    setBubbleOpen(false);
  };

  const openBubble = (): void => {
    setBubbleOpen(true);
  };

  return (
    <div
      className={`pointer-events-none fixed bottom-4 right-3 z-40 flex max-w-[min(20rem,calc(100vw-1.5rem))] flex-col items-end sm:bottom-8 sm:right-6 ${isBn ? 'font-bengali' : ''}`}
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="companion"
          initial={false}
          animate={{ x: 0, opacity: 1 }}
          className="pointer-events-auto flex flex-col items-end gap-2"
        >
          <AnimatePresence initial={false}>
            {bubbleOpen ? (
              <motion.div
                key="bubble"
                initial={false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.22 } }
                }
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="relative w-full max-w-[min(20rem,calc(100vw-1.5rem))]"
              >
                <motion.div
                  key={active}
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="relative rounded-2xl border border-white/90 bg-white/95 px-3.5 py-2.5 text-left text-sm leading-snug text-text-main shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5 backdrop-blur-none sm:px-4 sm:backdrop-blur-md sm:text-[0.9375rem]"
                >
                  <span className="absolute -bottom-2 right-10 h-3 w-3 rotate-45 border-b border-r border-white/90 bg-white/95" />
                  <p className="relative pr-7">{line}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeBubble();
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-text-soft transition hover:bg-slate-100 hover:text-text-main"
                    aria-label={isBn ? 'বার্তা বন্ধ করুন' : 'Close message'}
                  >
                    ×
                  </button>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => {
              if (!bubbleOpen) openBubble();
            }}
            aria-label={
              bubbleOpen
                ? isBn
                  ? 'স্ক্রল সহকারী'
                  : 'Scroll companion'
                : isBn
                  ? 'বার্তা খুলুন'
                  : 'Open message'
            }
            aria-expanded={bubbleOpen}
            className={`mr-2 flex h-[5.5rem] w-[4.5rem] items-end justify-center rounded-2xl border-0 bg-transparent p-0 outline-none transition sm:h-[6.25rem] sm:w-[5rem] ${
              !bubbleOpen
                ? 'cursor-pointer hover:opacity-95 focus-visible:ring-2 focus-visible:ring-brand-teal/50 focus-visible:ring-offset-2'
                : 'cursor-default'
            }`}
          >
            <motion.div
              className="flex h-full w-full items-end justify-center"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      y: [0, -5, 0],
                    }
              }
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <KidSvg reduceMotion={!!reduceMotion} />
            </motion.div>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function KidSvg({ reduceMotion }: { reduceMotion: boolean }): React.ReactElement {
  const WaveArm = reduceMotion ? (
    <g>
      <path
        d="M88 78c12 4 22 18 24 34"
        fill="none"
        stroke="#EA580C"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={112} cy={114} r={7} fill="#FFE4C4" stroke="#EA580C" strokeWidth={1.2} />
    </g>
  ) : (
    <motion.g
      animate={{ rotate: [0, 6, -4, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformOrigin: '90px 92px' }}
    >
      <path
        d="M88 78c12 4 22 18 24 34"
        fill="none"
        stroke="#EA580C"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={112} cy={114} r={7} fill="#FFE4C4" stroke="#EA580C" strokeWidth={1.2} />
    </motion.g>
  );

  return (
    <svg viewBox="0 0 120 140" className="h-full w-full overflow-visible drop-shadow-lg">
      <ellipse cx={60} cy={128} rx={34} ry={10} fill="rgba(15,23,42,0.07)" />
      <path
        d="M60 118c-16 0-28-10-30-24l-4-38c-1-12 8-22 20-23h28c12 1 21 11 20 23l-4 38c-2 14-14 24-30 24z"
        fill="#FBBF77"
        stroke="#EA580C"
        strokeWidth={1.5}
      />
      <circle cx={60} cy={52} r={32} fill="#FFE4C4" stroke="#F97316" strokeWidth={1.5} />
      <path d="M32 48c4-10 14-16 28-16s24 6 28 16" fill="none" stroke="#EA580C" strokeWidth={2} strokeLinecap="round" />
      <ellipse cx={48} cy={54} rx={4} ry={5} fill="#1E293B" />
      <ellipse cx={72} cy={54} rx={4} ry={5} fill="#1E293B" />
      <path
        d="M52 68c6 6 16 6 22 0"
        fill="none"
        stroke="#1E293B"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {WaveArm}
    </svg>
  );
}
