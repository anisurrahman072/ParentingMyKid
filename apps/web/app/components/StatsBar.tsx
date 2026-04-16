'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

import { FacebookMarkIcon } from '@/app/components/FacebookFollowButton';
import { FACEBOOK_PAGE_URL } from '@/lib/constants';
import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

const COMMUNITY_DOTS: { bg: string }[] = [
  { bg: 'linear-gradient(135deg,#fff 0%,#fde68a 100%)' },
  { bg: 'linear-gradient(135deg,#fff 0%,#fbcfe8 100%)' },
  { bg: 'linear-gradient(135deg,#fff 0%,#a7f3d0 100%)' },
  { bg: 'linear-gradient(135deg,#fff 0%,#e9d5ff 100%)' },
  { bg: 'linear-gradient(135deg,#fff 0%,#bae6fd 100%)' },
  { bg: 'linear-gradient(135deg,#fff 0%,#fecdd3 100%)' },
  { bg: 'linear-gradient(135deg,#fff 0%,#d8b4fe 100%)' },
];

/** Arc offsets (px) — gentle human “huddle” curve */
const ARC_MB = [0, 5, 9, 11, 9, 5, 0];

/** Six “stepping stones” on a path — different motif from the community dots */
function AreasJourneyDecoration(): React.ReactElement {
  const nodes: [number, number][] = [
    [12, 36],
    [44, 24],
    [76, 16],
    [112, 22],
    [148, 32],
    [180, 18],
  ];
  return (
    <svg
      className="mb-5 h-14 w-[13.5rem] max-w-full sm:w-[15rem]"
      viewBox="0 0 200 52"
      aria-hidden
    >
      <defs>
        <linearGradient id="stats-areas-path" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(167,243,208,0.95)" />
        </linearGradient>
      </defs>
      <path
        d="M6 40 C 36 14, 68 10, 100 24 S 156 40, 194 16"
        fill="none"
        stroke="url(#stats-areas-path)"
        strokeLinecap="round"
        strokeWidth="2.25"
        opacity={0.88}
      />
      {nodes.map(([cx, cy], i) => (
        <motion.g key={i} style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <motion.rect
            x={cx - 5}
            y={cy - 5}
            width={10}
            height={10}
            rx={2.5}
            fill="rgba(255,255,255,0.95)"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={1}
            transform={`rotate(38 ${cx} ${cy})`}
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.12,
            }}
          />
        </motion.g>
      ))}
    </svg>
  );
}

/** Soft waves = daily rhythm — distinct from dots and path nodes */
/** Bottom-center Facebook mark — rhythm pillar only; premium disc + gentle shake. */
function RhythmFacebookBadge(): React.ReactElement {
  const reduceMotion = useReducedMotion();

  return (
    <motion.a
      href={FACEBOOK_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ transformOrigin: '50% 0%' }}
      className="mt-6 inline-flex h-[3.35rem] w-[3.35rem] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal via-teal-600 to-brand-purple text-white shadow-[0_10px_28px_-6px_rgba(0,0,0,0.42),0_2px_10px_rgba(0,0,0,0.18)] ring-2 ring-white/35 ring-offset-2 ring-offset-transparent transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
      aria-label="Facebook page"
      initial={false}
      animate={
        reduceMotion
          ? {}
          : {
              /* Pivot at top: bottom of the circle swings side-to-side */
              rotate: [-5.5, 5.5],
            }
      }
      transition={{
        duration: 2.15,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      }}
    >
      <FacebookMarkIcon className="h-[1.65rem] w-[1.65rem] sm:h-[1.8rem] sm:w-[1.8rem]" />
    </motion.a>
  );
}

function RhythmWavesDecoration(): React.ReactElement {
  const waves = [
    'M 4 30 Q 52 14 100 30 T 196 28',
    'M 4 36 Q 56 48 104 36 T 196 34',
    'M 4 22 Q 48 8 96 22 T 196 20',
  ];
  return (
    <svg
      className="mb-5 h-12 w-[13rem] max-w-full sm:w-[14.5rem]"
      viewBox="0 0 200 52"
      aria-hidden
    >
      <defs>
        <linearGradient id="stats-rhythm-w" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="50%" stopColor="rgba(253,224,255,0.95)" />
          <stop offset="100%" stopColor="rgba(186,230,253,0.85)" />
        </linearGradient>
      </defs>
      {waves.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="url(#stats-rhythm-w)"
          strokeLinecap="round"
          strokeWidth={i === 1 ? 2 : 1.6}
          opacity={0.75 + i * 0.06}
          animate={{ opacity: [0.35 + i * 0.08, 0.85, 0.35 + i * 0.08] }}
          transition={{
            duration: 2.8 + i * 0.25,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
      <motion.circle
        cx={100}
        cy={26}
        r={3.2}
        fill="rgba(255,255,255,0.95)"
        animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

export function StatsBar({ content }: Props): React.ReactElement {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20%' });
  const isBn = content.locale === 'bn';

  return (
    <section ref={ref} className="px-4 py-5 sm:px-6 sm:py-7 md:px-10 lg:px-12">
      <div
        className="relative overflow-hidden rounded-[2rem_2.65rem_2.35rem_2.5rem] bg-gradient-to-r from-brand-teal via-emerald-500 to-brand-purple px-4 py-12 text-white shadow-[0_22px_56px_-14px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-inset ring-white/20 sm:rounded-[2.15rem_2.85rem_2.5rem_2.65rem] sm:py-14 md:rounded-[2.35rem_3rem_2.65rem_2.85rem]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.04] blur-2xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-[3rem] border border-white/10 bg-fuchsia-500/10 blur-2xl" />

        <div className="relative mx-auto grid max-w-5xl grid-cols-1 gap-6 text-center sm:grid-cols-3 sm:gap-5">
          <CommunityPillar
            isInView={isInView}
            isBn={isBn}
            headline={content.stats.community.headline}
            supporting={content.stats.community.supporting}
            honestLine={content.stats.community.honestLine}
          />
          <StatPillar
            curveClass="rounded-[1.35rem_2.85rem_1.45rem_2.1rem] sm:rounded-[1.35rem_2.85rem_1.45rem_2.1rem]"
            decor="areas"
            isInView={isInView}
            delay={0.06}
            isBn={isBn}
          >
            <AreasStatBlock
              primary={content.stats.areas.value}
              label={content.stats.areas.label}
              supporting={content.stats.areas.supporting}
            />
          </StatPillar>
          <StatPillar
            curveClass="rounded-[2.45rem_1.35rem_2.2rem_1.55rem] sm:rounded-[2.45rem_1.35rem_2.2rem_1.55rem]"
            decor="rhythm"
            isInView={isInView}
            delay={0.12}
            isBn={isBn}
          >
            <div className="flex w-full flex-col items-center">
              <StatBlockText
                value={content.stats.rhythm.value}
                label={content.stats.rhythm.label}
                supporting={content.stats.rhythm.supporting}
              />
              <RhythmFacebookBadge />
            </div>
          </StatPillar>
        </div>
      </div>
    </section>
  );
}

function StatPillar({
  children,
  curveClass,
  decor,
  isInView,
  delay,
  isBn,
}: {
  children: React.ReactNode;
  curveClass: string;
  decor?: 'areas' | 'rhythm';
  isInView: boolean;
  delay: number;
  isBn: boolean;
}): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay }}
      className={`stats-glass-panel relative border p-7 transition-transform duration-300 hover:-translate-y-1 ${curveClass} ${
        isBn ? 'font-bengali' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-x-4 top-3 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <div className="relative z-10 flex min-h-[11rem] flex-col items-center sm:min-h-[12rem]">
        {decor === 'areas' ? <AreasJourneyDecoration /> : null}
        {decor === 'rhythm' ? <RhythmWavesDecoration /> : null}
        {children}
      </div>
    </motion.div>
  );
}

function CommunityPillar({
  isInView,
  isBn,
  headline,
  supporting,
  honestLine,
}: {
  isInView: boolean;
  isBn: boolean;
  headline: string;
  supporting: string;
  honestLine: string;
}): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55 }}
      className={`stats-glass-panel relative border p-7 transition-transform duration-300 hover:-translate-y-1 rounded-[2.15rem_2.65rem_1.65rem_2.35rem] sm:rounded-[2.15rem_2.65rem_1.65rem_2.35rem] ${
        isBn ? 'font-bengali' : ''
      }`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border border-white/15 bg-gradient-to-br from-white/20 to-transparent opacity-70" />
      <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-44 rotate-[-8deg] rounded-[2.5rem] border border-white/10 bg-white/[0.06]" />
      <div className="pointer-events-none absolute inset-x-6 top-4 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="relative z-10 flex min-h-[11rem] flex-col items-center sm:min-h-[12rem]">
        <div
          className="mb-5 flex h-[3.25rem] w-full max-w-[240px] items-end justify-center gap-[0.35rem] sm:max-w-[260px] sm:gap-2"
          aria-hidden
        >
          {COMMUNITY_DOTS.map((d, i) => (
            <motion.span
              key={i}
              className="inline-block h-3 w-3 rounded-full border border-white/45 shadow-[0_2px_8px_rgba(0,0,0,0.12)] sm:h-3.5 sm:w-3.5"
              style={{
                background: d.bg,
                marginBottom: ARC_MB[i],
              }}
              animate={{ y: [0, -4 - (i % 3), 0] }}
              transition={{
                duration: 2.8 + i * 0.12,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.08,
              }}
              whileHover={{ scale: 1.2, y: -6 }}
            />
          ))}
        </div>

        <p className="stats-text-display text-2xl font-black leading-tight tracking-tight sm:text-3xl">
          {headline}
        </p>
        <p className="stats-text-body mt-3 max-w-[21rem] text-sm font-semibold leading-relaxed sm:text-base">
          {supporting}
        </p>
        <p className="stats-text-quiet mt-3 max-w-[20rem] text-xs font-semibold leading-relaxed sm:text-[0.8125rem]">
          {honestLine}
        </p>
      </div>
    </motion.div>
  );
}

/** Middle pillar — same field layout as Bangla: headline line + main paragraph (+ optional extra). */
function AreasStatBlock({
  primary,
  label,
  supporting,
}: {
  primary: string;
  label: string;
  supporting: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center">
      <p className="stats-text-display max-w-[21rem] text-center text-2xl font-black leading-tight tracking-tight sm:text-3xl">
        {primary}
      </p>
      <p className="stats-text-body mt-3 max-w-[21rem] text-sm font-semibold leading-relaxed sm:text-base">
        {label}
      </p>
      {supporting ? (
        <p className="stats-text-quiet mt-3 max-w-[20rem] text-xs font-semibold leading-relaxed sm:text-[0.8125rem]">
          {supporting}
        </p>
      ) : null}
    </div>
  );
}

function StatBlockText({
  value,
  label,
  supporting,
}: {
  value: string;
  label: string;
  supporting: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center">
      <p className="stats-text-display text-4xl font-black leading-tight sm:text-5xl">{value}</p>
      <p className="stats-text-body mt-2 max-w-[21rem] text-base font-bold leading-snug sm:text-lg">{label}</p>
      <p className="stats-text-body mt-3 max-w-[21rem] text-sm font-semibold leading-relaxed sm:text-base">
        {supporting}
      </p>
    </div>
  );
}
