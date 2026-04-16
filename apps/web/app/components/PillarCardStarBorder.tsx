'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { useCoarsePointer } from '@/lib/use-coarse-pointer';

type Props = {
  /** Which pillar card (0–5) — picks star colors */
  variant: number;
};

const PALETTES = [
  ['#FBBF24', '#F472B6', '#22D3EE', '#A78BFA'],
  ['#FB7185', '#34D399', '#FBBF24', '#60A5FA'],
  ['#C084FC', '#2DD4BF', '#FACC15', '#F9A8D4'],
  ['#38BDF8', '#FB923C', '#A78BFA', '#4ADE80'],
  ['#F472B6', '#818CF8', '#FDE047', '#2DD4BF'],
  ['#E879F9', '#FBBF24', '#67E8F9', '#86EFAC'],
] as const;

const POSITIONS: { className: string }[] = [
  { className: '-left-1 -top-1' },
  { className: 'left-[18%] -top-2' },
  { className: '-right-1 -top-1' },
  { className: '-right-1 top-[38%]' },
  { className: '-right-2 -bottom-1' },
  { className: 'left-[30%] -bottom-2' },
  { className: '-left-2 -bottom-1' },
  { className: '-left-2 top-[32%]' },
];

function StarGlyph({ color }: { color: string }): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="overflow-visible" aria-hidden>
      <path
        fill={color}
        d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

export function PillarCardStarBorder({ variant }: Props): React.ReactElement {
  const reduceMotion = useReducedMotion() ?? false;
  const isCoarse = useCoarsePointer();
  const colors = PALETTES[variant % PALETTES.length];
  const animate = !reduceMotion && !isCoarse;

  return (
    <div className="pointer-events-none absolute inset-[-8px] z-30 overflow-visible" aria-hidden>
      {POSITIONS.map((pos, i) => {
        const color = colors[i % colors.length];
        return animate ? (
          <motion.span
            key={i}
            className={`absolute ${pos.className}`}
            initial={false}
            animate={{
              opacity: [0.35, 1, 0.45, 0.95, 0.35],
              scale: [0.75, 1.12, 0.9, 1.05, 0.75],
            }}
            transition={{
              duration: 2.4 + (i % 4) * 0.35,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.22,
            }}
          >
            <StarGlyph color={color} />
          </motion.span>
        ) : (
          <span key={i} className={`absolute opacity-70 ${pos.className}`}>
            <StarGlyph color={color} />
          </span>
        );
      })}
    </div>
  );
}
