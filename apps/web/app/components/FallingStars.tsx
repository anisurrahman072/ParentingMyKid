'use client';

/** Pastel / jewel tones — soft enough for the hero mesh */
const STARS: {
  left: string;
  drift: string;
  duration: number;
  delay: number;
  sizePx: number;
  color: string;
  peak: number;
  glyph: '★' | '✦';
  hideOnNarrow?: boolean;
}[] = [
  { left: '6%', drift: '24px', duration: 16, delay: -1, sizePx: 12, color: '#F472B6', peak: 0.52, glyph: '★' },
  { left: '18%', drift: '-14px', duration: 19, delay: -7, sizePx: 9, color: '#FACC15', peak: 0.45, glyph: '✦' },
  { left: '31%', drift: '32px', duration: 14, delay: -3, sizePx: 14, color: '#38BDF8', peak: 0.5, glyph: '★' },
  { left: '44%', drift: '-22px', duration: 21, delay: -11, sizePx: 8, color: '#22D3EE', peak: 0.4, glyph: '✦' },
  { left: '52%', drift: '18px', duration: 17, delay: -5, sizePx: 11, color: '#FB7185', peak: 0.48, glyph: '★' },
  { left: '63%', drift: '-28px', duration: 20, delay: -9, sizePx: 10, color: '#C084FC', peak: 0.42, glyph: '✦' },
  { left: '74%', drift: '14px', duration: 15, delay: -2, sizePx: 13, color: '#F9A8D4', peak: 0.5, glyph: '★' },
  { left: '84%', drift: '-18px', duration: 18, delay: -13, sizePx: 9, color: '#4ADE80', peak: 0.38, glyph: '✦' },
  { left: '11%', drift: '10px', duration: 22, delay: -15, sizePx: 7, color: '#FDBA74', peak: 0.35, glyph: '✦', hideOnNarrow: true },
  { left: '38%', drift: '-12px', duration: 13, delay: -4, sizePx: 10, color: '#A5B4FC', peak: 0.44, glyph: '★', hideOnNarrow: true },
  { left: '69%', drift: '20px', duration: 23, delay: -18, sizePx: 8, color: '#2DD4BF', peak: 0.36, glyph: '✦', hideOnNarrow: true },
  { left: '91%', drift: '-8px', duration: 16, delay: -6, sizePx: 11, color: '#E879F9', peak: 0.46, glyph: '★' },
];

export function FallingStars(): React.ReactElement {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden motion-reduce:hidden"
      aria-hidden
    >
      {STARS.map((s, i) => (
        <span
          key={`${s.left}-${i}`}
          className={`absolute top-0 select-none ${
            s.hideOnNarrow ? 'hidden sm:inline' : ''
          }`}
          style={{
            left: s.left,
            ['--star-drift' as string]: s.drift,
            ['--star-o' as string]: String(s.peak),
            fontSize: `${s.sizePx}px`,
            color: s.color,
            textShadow: '0 0 10px rgba(255,255,255,0.55)',
            animationName: 'heroStarFall',
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}
