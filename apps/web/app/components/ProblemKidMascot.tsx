'use client';

import { useEffect, useMemo, useRef } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

type Props = {
  /** Thought / speech line (lonely or confused tone); localized from landing content */
  bubbleText: string;
  /** Follow-up thought line shown a few seconds later. */
  bubbleFollowupText?: string;
  isBn?: boolean;
  className?: string;
};

/**
 * Cartoon kid (vector SVG) — upset / sulky, not crying (no tears).
 * Thought bubble animates in from above the head; idle sway on the figure.
 *
 * Typewriter effect uses a DOM ref to update textContent directly so React
 * never re-renders during the 42 ms interval — eliminating 24 setState calls
 * per second on the main thread.
 */
export function ProblemKidMascot({
  bubbleText,
  bubbleFollowupText,
  isBn = false,
  className = '',
}: Props): React.ReactElement {
  const reduceMotion = useReducedMotion() ?? false;
  const bubbleLines = useMemo(
    () => [bubbleText, bubbleFollowupText].filter(Boolean) as string[],
    [bubbleText, bubbleFollowupText],
  );
  // Direct DOM ref — text is written via textContent, bypassing React's render cycle
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (bubbleLines.length === 0) return;

    if (reduceMotion) {
      if (textRef.current) textRef.current.textContent = bubbleLines[0] ?? bubbleText;
      return;
    }

    let isCancelled = false;
    const timers: number[] = [];

    const typeLine = (line: string, next: () => void): void => {
      let index = 0;
      if (textRef.current) textRef.current.textContent = '';

      const intervalId = window.setInterval(() => {
        if (isCancelled) return;
        index += 1;
        if (textRef.current) textRef.current.textContent = line.slice(0, index);

        if (index >= line.length) {
          window.clearInterval(intervalId);
          const holdId = window.setTimeout(() => {
            if (!isCancelled) next();
          }, 2300);
          timers.push(holdId);
        }
      }, 42);

      timers.push(intervalId);
    };

    const runSequence = (lineIndex: number): void => {
      const line = bubbleLines[lineIndex];
      if (!line) {
        if (textRef.current) textRef.current.textContent = '';
        return;
      }
      typeLine(line, () => {
        const hasNext = lineIndex + 1 < bubbleLines.length;
        if (hasNext) {
          runSequence(lineIndex + 1);
          return;
        }
        const restartId = window.setTimeout(() => {
          if (!isCancelled) runSequence(0);
        }, 1400);
        timers.push(restartId);
      });
    };

    runSequence(0);

    return () => {
      isCancelled = true;
      timers.forEach((id) => {
        window.clearInterval(id);
        window.clearTimeout(id);
      });
    };
  }, [reduceMotion, bubbleLines, bubbleText]);

  return (
    <div className={`relative ${className}`}>
      {/* Accessible full text for screen readers */}
      <p className="sr-only">{bubbleLines.join(' ')}</p>
      <div
        className="pointer-events-none shrink-0 max-md:h-[min(5.25rem,14vw)] max-md:min-h-[4.25rem] md:hidden"
        aria-hidden
      />

      <AnimatePresence>
        <motion.div
          aria-hidden
          className="absolute bottom-[86%] left-[5%] z-10 w-[min(16rem,calc(100vw-2.2rem))] sm:bottom-[94%] sm:left-[2%]"
          initial={
            reduceMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.82, y: 16 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.84, y: -10 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  delay: 0.45,
                  type: 'spring',
                  stiffness: 340,
                  damping: 23,
                  mass: 0.68,
                }
          }
        >
          <motion.div
            className="relative text-center"
            animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Cloud body */}
            <div className="relative z-[2] mx-auto rounded-[999px] border border-amber-200/85 bg-gradient-to-br from-white via-amber-50/95 to-amber-100/90 px-5 py-4 shadow-[0_12px_36px_-8px_rgba(120,53,15,0.22)] ring-1 ring-amber-900/10 backdrop-blur-[2px]">
              <span className="absolute -left-3 bottom-3 h-7 w-7 rounded-full border border-amber-200/85 bg-gradient-to-br from-white via-amber-50/95 to-amber-100/90" />
              <span className="absolute -right-4 bottom-5 h-8 w-8 rounded-full border border-amber-200/85 bg-gradient-to-br from-white via-amber-50/95 to-amber-100/90" />
              <span className="absolute left-6 -top-4 h-10 w-10 rounded-full border border-amber-200/85 bg-gradient-to-br from-white via-amber-50/95 to-amber-100/90" />
              <span className="absolute right-10 -top-3 h-8 w-8 rounded-full border border-amber-200/85 bg-gradient-to-br from-white via-amber-50/95 to-amber-100/90" />

              {/*
               * textContent is written directly via textRef — no React children here
               * so React never reconciles this element's content on re-renders.
               */}
              <p
                ref={textRef}
                aria-hidden
                className={`relative z-[3] min-h-[2.6rem] text-[0.74rem] font-semibold leading-snug text-slate-700 sm:min-h-[2.8rem] sm:text-sm ${
                  isBn ? 'font-bengali' : ''
                }`}
              />
            </div>

            {/* Thought dots: from LEFT side of head up to cloud */}
            <div className="pointer-events-none absolute left-[20%] top-full z-[1]" aria-hidden>
              <span className="absolute top-0 h-3.5 w-3.5 rounded-full border border-amber-300/90 bg-amber-100/95" />
              <span className="absolute left-[6px] top-7 h-2.5 w-2.5 rounded-full border border-amber-400/90 bg-amber-200/95" />
              <span className="absolute left-[11px] top-12 h-1.5 w-1.5 rounded-full border border-amber-500/95 bg-amber-300/95" />
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <motion.div
        className="relative mx-auto w-full max-w-[12.5rem] drop-shadow-[0_18px_40px_rgba(15,23,42,0.16)] max-md:mt-5 sm:max-w-[13.5rem]"
        style={{ transformOrigin: '50% 92%' }}
        aria-hidden
        initial={
          reduceMotion ? { opacity: 1, x: 0, rotate: 10 } : { opacity: 0, x: -56, rotate: 4 }
        }
        animate={{ opacity: 1, x: 0, rotate: 10 }}
        transition={{ type: 'spring', stiffness: 155, damping: 22 }}
      >
        <motion.div
          style={{ transformOrigin: '50% 92%' }}
          animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 200 260" className="h-auto w-full" role="img">
            <title>Upset cartoon child</title>
            <ellipse cx="100" cy="248" rx="56" ry="9" fill="rgba(15,23,42,0.07)" />

            {/* Legs */}
            <path
              d="M82 198 L78 236 L92 240 L98 204 Z"
              fill="#2563EB"
              stroke="#1E3A8A"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M118 198 L122 236 L108 240 L102 204 Z"
              fill="#2563EB"
              stroke="#1E3A8A"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <ellipse cx="85" cy="240" rx="13" ry="7" fill="#1E3A8A" />
            <ellipse cx="115" cy="240" rx="13" ry="7" fill="#1E3A8A" />

            {/* Body */}
            <path
              d="M72 118 Q100 108 128 118 L134 196 Q100 206 66 196 Z"
              fill="#FBBF24"
              stroke="#D97706"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M66 196 Q100 206 134 196 L130 208 Q100 216 70 208 Z"
              fill="#2563EB"
              stroke="#1E3A8A"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            {/* Arms crossed — reads “upset / sulky” */}
            <path
              d="M128 128 Q148 148 138 178"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <path
              d="M72 128 Q52 148 62 178"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <path
              d="M75 152 Q100 168 125 152"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* Head */}
            <ellipse
              cx="100"
              cy="86"
              rx="46"
              ry="50"
              fill="#FFE4D4"
              stroke="#E8B4A0"
              strokeWidth="1.4"
            />

            {/* Hair */}
            <path
              d="M54 76 Q62 34 100 32 Q138 34 146 76 Q128 48 100 46 Q72 48 54 76"
              fill="#4A3728"
              stroke="#2D2118"
              strokeWidth="1"
              strokeLinejoin="round"
            />

            {/* Upset brows — angled in, no tears */}
            <path
              d="M76 68 Q84 62 92 66"
              fill="none"
              stroke="#4A3728"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path
              d="M108 66 Q116 62 124 68"
              fill="none"
              stroke="#4A3728"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Eyes: side-eye / annoyed */}
            <ellipse cx="84" cy="88" rx="6" ry="7" fill="#1E293B" />
            <ellipse cx="116" cy="88" rx="6" ry="7" fill="#1E293B" />
            <ellipse cx="86" cy="85" rx="2.2" ry="2.4" fill="#fff" opacity="0.85" />
            <ellipse cx="118" cy="85" rx="2.2" ry="2.4" fill="#fff" opacity="0.85" />

            {/* Sulky mouth — downturned, not bawling */}
            <path
              d="M88 114 Q100 108 112 114"
              fill="none"
              stroke="#9A6B5C"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Cheek puff — optional subtle upset */}
            <ellipse cx="72" cy="102" rx="5" ry="4" fill="#F9A8A8" opacity="0.35" />
            <ellipse cx="128" cy="102" rx="5" ry="4" fill="#F9A8A8" opacity="0.35" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}
