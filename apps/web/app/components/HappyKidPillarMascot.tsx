'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  className?: string;
};

const jumpEase = [0.34, 1.15, 0.64, 1] as const;

/** Illustrated jumping kid — SVG cartoon (not emoji); hurrah pose, motion lines, subtle smile pulse */
export function HappyKidPillarMascot({ className = '' }: Props): React.ReactElement {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className={`relative ${className}`} aria-hidden>
      <motion.div
        className="relative mx-auto flex w-full max-w-[13rem] justify-center sm:max-w-[14rem] md:max-w-[15rem]"
        initial={reduceMotion ? false : { opacity: 0, x: 28 }}
        animate={
          reduceMotion
            ? { opacity: 1, x: 0 }
            : {
                opacity: 1,
                x: 0,
                y: [0, -18, 0],
                rotate: [0, -2.5, 0],
                scaleY: [1, 0.94, 1],
                scaleX: [1, 1.03, 1],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0.35 }
            : {
                y: { repeat: Infinity, duration: 0.95, ease: jumpEase, times: [0, 0.42, 1] },
                rotate: { repeat: Infinity, duration: 0.95, ease: jumpEase, times: [0, 0.42, 1] },
                scaleY: { repeat: Infinity, duration: 0.95, ease: jumpEase, times: [0, 0.42, 1] },
                scaleX: { repeat: Infinity, duration: 0.95, ease: jumpEase, times: [0, 0.42, 1] },
                opacity: { duration: 0.4 },
              }
        }
      >
        {/* Side “jump” streaks */}
        <svg
          className="pointer-events-none absolute -left-6 bottom-[14%] z-0 h-28 w-11 overflow-visible sm:-left-8 sm:h-32 sm:w-12"
          viewBox="0 0 44 104"
          aria-hidden
        >
          {[0, 1, 2].map((i) => (
            <motion.line
              key={`L-${i}`}
              x1={10 + i * 5}
              y1={96 - i * 5}
              x2={3 + i * 3}
              y2={22 + i * 10}
              stroke="currentColor"
              strokeWidth={2.4 - i * 0.35}
              strokeLinecap="round"
              className="text-violet-400/90"
              animate={
                reduceMotion
                  ? { opacity: 0.55 }
                  : { opacity: [0.3, 1, 0.3], strokeWidth: [2, 2.8 - i * 0.35, 2] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { repeat: Infinity, duration: 0.95, ease: jumpEase, delay: i * 0.05 }
              }
            />
          ))}
        </svg>
        <svg
          className="pointer-events-none absolute -right-5 bottom-[14%] z-0 h-28 w-11 overflow-visible sm:-right-7 sm:h-32 sm:w-12"
          viewBox="0 0 44 104"
          aria-hidden
        >
          {[0, 1, 2].map((i) => (
            <motion.line
              key={`R-${i}`}
              x1={34 - i * 5}
              y1={96 - i * 5}
              x2={41 - i * 3}
              y2={22 + i * 10}
              stroke="currentColor"
              strokeWidth={2.4 - i * 0.35}
              strokeLinecap="round"
              className="text-fuchsia-400/85"
              animate={reduceMotion ? { opacity: 0.55 } : { opacity: [0.3, 1, 0.3] }}
              transition={
                reduceMotion
                  ? undefined
                  : { repeat: Infinity, duration: 0.95, ease: jumpEase, delay: i * 0.05 }
              }
            />
          ))}
        </svg>

        <svg
          viewBox="0 0 220 278"
          className="relative z-10 h-auto w-[min(100%,10.5rem)] drop-shadow-[0_14px_32px_rgba(15,23,42,0.2)] sm:w-[11.5rem] md:w-[12.5rem]"
          role="img"
        >
          <title>Happy kid cheering</title>
          <defs>
            <linearGradient id="kidSkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE7C8" />
              <stop offset="100%" stopColor="#F0BC8E" />
            </linearGradient>
            <linearGradient id="kidHair" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A3428" />
              <stop offset="100%" stopColor="#2D1F18" />
            </linearGradient>
            <linearGradient id="kidShirt" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5EEAD4" />
              <stop offset="100%" stopColor="#14B8A6" />
            </linearGradient>
          </defs>

          <path
            fill="url(#kidHair)"
            stroke="#1a120e"
            strokeWidth="1.2"
            strokeLinejoin="round"
            d="M78 48c-12-18 8-42 38-44 22-2 44 8 52 28 6 14 4 30-6 42 8-6 22-4 28 6 4 8-2 18-12 22-6 3-14 2-20-2 2 10-4 20-14 24-10 4-22 0-30-8-4 18-26 28-44 18-14-8-18-26-12-42-8 4-18 2-24-6-6-10 2-24 14-28z"
          />

          <path
            fill="url(#kidSkin)"
            stroke="#E8A87C"
            strokeWidth="1.5"
            d="M52 116c0-34 28-58 62-58s62 24 62 58c0 36-22 56-62 56s-62-20-62-56z"
          />

          <ellipse cx="48" cy="116" rx="10" ry="12" fill="#F0BC8E" stroke="#E8A87C" strokeWidth="1.2" />
          <ellipse cx="172" cy="116" rx="10" ry="12" fill="#F0BC8E" stroke="#E8A87C" strokeWidth="1.2" />

          <ellipse cx="72" cy="134" rx="13" ry="8" fill="#FB7185" opacity="0.32" />
          <ellipse cx="148" cy="134" rx="13" ry="8" fill="#FB7185" opacity="0.32" />

          <ellipse cx="85" cy="106" rx="15" ry="19" fill="#1e293b" />
          <ellipse cx="135" cy="106" rx="15" ry="19" fill="#1e293b" />
          <ellipse cx="88" cy="100" rx="5" ry="6" fill="white" opacity="0.95" />
          <ellipse cx="138" cy="100" rx="5" ry="6" fill="white" opacity="0.95" />
          <ellipse cx="82" cy="112" rx="2.5" ry="3.5" fill="white" opacity="0.45" />
          <ellipse cx="132" cy="112" rx="2.5" ry="3.5" fill="white" opacity="0.45" />

          <path
            d="M68 86 Q82 80 96 84"
            fill="none"
            stroke="#3D2914"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M124 84 Q138 80 152 86"
            fill="none"
            stroke="#3D2914"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          <motion.g
            animate={reduceMotion ? {} : { scaleY: [1, 1.1, 1], y: [0, 1.2, 0] }}
            transition={{ repeat: Infinity, duration: 0.95, ease: 'easeInOut' }}
            style={{ transformOrigin: '110px 150px', transformBox: 'fill-box' }}
          >
            <path
              d="M78 146c14 24 50 24 64 0"
              fill="none"
              stroke="#991B1B"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M88 150c8 12 36 12 44 0"
              fill="#FFF7F7"
              stroke="#FECDD3"
              strokeWidth="1"
            />
            <path
              d="M94 154h32"
              stroke="#FDA4AF"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </motion.g>

          <path d="M96 166h28v14H96z" fill="url(#kidSkin)" />

          <path
            d="M72 180c0-8 16-12 38-12s38 4 38 12v48c0 10-18 16-38 16s-38-6-38-16z"
            fill="url(#kidShirt)"
            stroke="#0D9488"
            strokeWidth="1.4"
          />
          <rect x="96" y="194" width="40" height="7" rx="1.5" fill="#0F766E" opacity="0.35" />

          {/* Hurrah arms — strokes read clearly as raised hands */}
          <path
            d="M76 182 Q44 120 24 88"
            fill="none"
            stroke="#F0BC8E"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <circle cx="22" cy="84" r="13" fill="#F0BC8E" stroke="#C2410C" strokeWidth="1.2" />
          <path
            d="M144 182 Q176 120 196 88"
            fill="none"
            stroke="#F0BC8E"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <circle cx="198" cy="84" r="13" fill="#F0BC8E" stroke="#C2410C" strokeWidth="1.2" />

          <path
            d="M74 226h72c4 0 8 4 8 10v20H66v-20c0-6 4-10 8-10z"
            fill="#6366F1"
            stroke="#4338CA"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />

          <path
            d="M88 254 L82 268 L98 272 L104 252Z"
            fill="#6366F1"
            stroke="#4338CA"
            strokeWidth="1.1"
          />
          <path
            d="M132 254 L138 268 L122 272 L116 252Z"
            fill="#6366F1"
            stroke="#4338CA"
            strokeWidth="1.1"
          />
          <ellipse cx="94" cy="272" rx="12" ry="6" fill="#1E1B4B" />
          <ellipse cx="126" cy="272" rx="12" ry="6" fill="#1E1B4B" />
        </svg>
      </motion.div>
    </div>
  );
}
