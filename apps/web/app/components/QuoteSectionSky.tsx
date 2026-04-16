'use client';

/**
 * Falling stars + soft snow on the light outer background behind the quote card.
 * Mirrors the hero’s jewel-tone stars with extra density; snow uses a gentler drift.
 */

type StarSpec = {
  left: string;
  drift: string;
  duration: number;
  delay: number;
  sizePx: number;
  color: string;
  peak: number;
  glyph: '★' | '✦';
  hideOnNarrow?: boolean;
};

const STARS: StarSpec[] = [
  { left: '2%', drift: '22px', duration: 18, delay: -3, sizePx: 9, color: '#F472B6', peak: 0.48, glyph: '✦' },
  { left: '4%', drift: '18px', duration: 17, delay: -2, sizePx: 11, color: '#F472B6', peak: 0.5, glyph: '★' },
  { left: '7%', drift: '-16px', duration: 20, delay: -10, sizePx: 7, color: '#E879F9', peak: 0.38, glyph: '✦' },
  { left: '11%', drift: '-12px', duration: 21, delay: -8, sizePx: 8, color: '#FACC15', peak: 0.42, glyph: '✦' },
  { left: '14%', drift: '26px', duration: 16, delay: -5, sizePx: 10, color: '#FB7185', peak: 0.46, glyph: '★' },
  { left: '19%', drift: '28px', duration: 15, delay: -4, sizePx: 14, color: '#38BDF8', peak: 0.52, glyph: '★' },
  { left: '23%', drift: '-22px', duration: 19, delay: -13, sizePx: 6, color: '#94A3B8', peak: 0.34, glyph: '✦' },
  { left: '27%', drift: '-20px', duration: 19, delay: -11, sizePx: 9, color: '#22D3EE', peak: 0.4, glyph: '✦' },
  { left: '31%', drift: '19px', duration: 17, delay: -1, sizePx: 12, color: '#F0ABFC', peak: 0.5, glyph: '★' },
  { left: '35%', drift: '14px', duration: 16, delay: -1, sizePx: 12, color: '#FB7185', peak: 0.48, glyph: '★' },
  { left: '39%', drift: '-30px', duration: 24, delay: -16, sizePx: 8, color: '#C084FC', peak: 0.4, glyph: '✦' },
  { left: '43%', drift: '-26px', duration: 22, delay: -14, sizePx: 7, color: '#C084FC', peak: 0.36, glyph: '✦', hideOnNarrow: true },
  { left: '47%', drift: '-18px', duration: 13, delay: 0, sizePx: 15, color: '#F0ABFC', peak: 0.55, glyph: '★' },
  { left: '51%', drift: '22px', duration: 18, delay: -6, sizePx: 10, color: '#F9A8D4', peak: 0.46, glyph: '✦' },
  { left: '55%', drift: '11px', duration: 14, delay: -7, sizePx: 9, color: '#4ADE80', peak: 0.44, glyph: '✦' },
  { left: '58%', drift: '-16px', duration: 14, delay: -3, sizePx: 13, color: '#4ADE80', peak: 0.5, glyph: '★' },
  { left: '62%', drift: '24px', duration: 21, delay: -12, sizePx: 8, color: '#FDBA74', peak: 0.42, glyph: '✦' },
  { left: '66%', drift: '30px', duration: 20, delay: -9, sizePx: 8, color: '#A5B4FC', peak: 0.38, glyph: '✦' },
  { left: '70%', drift: '-19px', duration: 18, delay: -4, sizePx: 11, color: '#2DD4BF', peak: 0.47, glyph: '★' },
  { left: '74%', drift: '-24px', duration: 17, delay: -5, sizePx: 11, color: '#E879F9', peak: 0.44, glyph: '★' },
  { left: '78%', drift: '17px', duration: 23, delay: -18, sizePx: 7, color: '#FACC15', peak: 0.36, glyph: '✦' },
  { left: '82%', drift: '12px', duration: 23, delay: -17, sizePx: 9, color: '#2DD4BF', peak: 0.4, glyph: '✦' },
  { left: '86%', drift: '-21px', duration: 20, delay: -8, sizePx: 10, color: '#38BDF8', peak: 0.45, glyph: '★' },
  { left: '90%', drift: '-10px', duration: 16, delay: -7, sizePx: 12, color: '#FDBA74', peak: 0.48, glyph: '★' },
  { left: '93%', drift: '14px', duration: 19, delay: -11, sizePx: 8, color: '#34D399', peak: 0.4, glyph: '✦' },
  { left: '95%', drift: '16px', duration: 19, delay: -12, sizePx: 8, color: '#34D399', peak: 0.4, glyph: '✦' },
  { left: '97%', drift: '-11px', duration: 22, delay: -20, sizePx: 6, color: '#A78BFA', peak: 0.35, glyph: '✦' },
  { left: '9%', drift: '20px', duration: 25, delay: -19, sizePx: 6, color: '#94A3B8', peak: 0.32, glyph: '✦', hideOnNarrow: true },
  { left: '33%', drift: '-8px', duration: 26, delay: -21, sizePx: 5, color: '#CBD5E1', peak: 0.3, glyph: '✦', hideOnNarrow: true },
  { left: '61%', drift: '29px', duration: 27, delay: -23, sizePx: 6, color: '#C4B5FD', peak: 0.33, glyph: '✦', hideOnNarrow: true },
  { left: '84%', drift: '-7px', duration: 24, delay: -15, sizePx: 5, color: '#99F6E4', peak: 0.31, glyph: '✦', hideOnNarrow: true },
  /* Second wave — staggered delays so the sky stays busy between cycles */
  { left: '5%', drift: '-18px', duration: 19, delay: -9, sizePx: 8, color: '#F472B6', peak: 0.42, glyph: '✦' },
  { left: '18%', drift: '21px', duration: 22, delay: -6, sizePx: 9, color: '#22D3EE', peak: 0.44, glyph: '★' },
  { left: '29%', drift: '-24px', duration: 17, delay: -12, sizePx: 7, color: '#FB923C', peak: 0.4, glyph: '✦' },
  { left: '41%', drift: '16px', duration: 20, delay: -3, sizePx: 10, color: '#E879F9', peak: 0.46, glyph: '✦' },
  { left: '52%', drift: '-14px', duration: 18, delay: -15, sizePx: 11, color: '#FACC15', peak: 0.48, glyph: '★' },
  { left: '64%', drift: '27px', duration: 21, delay: -8, sizePx: 8, color: '#34D399', peak: 0.39, glyph: '✦' },
  { left: '76%', drift: '-20px', duration: 16, delay: -2, sizePx: 12, color: '#F0ABFC', peak: 0.51, glyph: '★' },
  { left: '88%', drift: '19px', duration: 23, delay: -14, sizePx: 7, color: '#38BDF8', peak: 0.37, glyph: '✦' },
  { left: '1%', drift: '12px', duration: 26, delay: -22, sizePx: 6, color: '#D8B4FE', peak: 0.33, glyph: '✦' },
  { left: '99%', drift: '-15px', duration: 24, delay: -10, sizePx: 7, color: '#FDE68A', peak: 0.41, glyph: '✦' },
  /* Third wave — extra density */
  { left: '0.5%', drift: '19px', duration: 20, delay: -6, sizePx: 10, color: '#FB7185', peak: 0.52, glyph: '★' },
  { left: '13%', drift: '-17px', duration: 18, delay: -14, sizePx: 9, color: '#F472B6', peak: 0.5, glyph: '✦' },
  { left: '25%', drift: '23px', duration: 21, delay: -4, sizePx: 8, color: '#A78BFA', peak: 0.48, glyph: '✦' },
  { left: '36%', drift: '-19px', duration: 19, delay: -10, sizePx: 11, color: '#38BDF8', peak: 0.54, glyph: '★' },
  { left: '45%', drift: '13px', duration: 22, delay: -7, sizePx: 7, color: '#FACC15', peak: 0.46, glyph: '✦' },
  { left: '54%', drift: '-23px', duration: 17, delay: -1, sizePx: 12, color: '#F0ABFC', peak: 0.55, glyph: '★' },
  { left: '67%', drift: '20px', duration: 20, delay: -13, sizePx: 9, color: '#4ADE80', peak: 0.5, glyph: '✦' },
  { left: '73%', drift: '-14px', duration: 23, delay: -5, sizePx: 8, color: '#FB923C', peak: 0.47, glyph: '✦' },
  { left: '81%', drift: '25px', duration: 18, delay: -16, sizePx: 10, color: '#22D3EE', peak: 0.51, glyph: '★' },
  { left: '89%', drift: '-20px', duration: 21, delay: -9, sizePx: 9, color: '#E879F9', peak: 0.49, glyph: '✦' },
  { left: '96.5%', drift: '17px', duration: 19, delay: -3, sizePx: 8, color: '#34D399', peak: 0.48, glyph: '✦' },
  { left: '16%', drift: '-11px', duration: 25, delay: -20, sizePx: 7, color: '#F9A8D4', peak: 0.45, glyph: '✦' },
  { left: '42%', drift: '18px', duration: 24, delay: -11, sizePx: 8, color: '#C084FC', peak: 0.46, glyph: '✦' },
  { left: '59%', drift: '-21px', duration: 22, delay: -18, sizePx: 10, color: '#2DD4BF', peak: 0.5, glyph: '★' },
  { left: '71%', drift: '14px', duration: 26, delay: -24, sizePx: 6, color: '#FDE68A', peak: 0.44, glyph: '✦' },
  { left: '85%', drift: '-9px', duration: 27, delay: -12, sizePx: 7, color: '#FDA4AF', peak: 0.46, glyph: '✦' },
  /* Fourth wave — offset timing */
  { left: '3.5%', drift: '-25px', duration: 23, delay: -17, sizePx: 9, color: '#60A5FA', peak: 0.48, glyph: '★' },
  { left: '22.5%', drift: '15px', duration: 16, delay: -8, sizePx: 11, color: '#F472B6', peak: 0.53, glyph: '★' },
  { left: '38%', drift: '-27px', duration: 22, delay: -2, sizePx: 8, color: '#A5B4FC', peak: 0.47, glyph: '✦' },
  { left: '50.5%', drift: '20px', duration: 25, delay: -19, sizePx: 7, color: '#FBBF24', peak: 0.45, glyph: '✦' },
  { left: '65.5%', drift: '-16px', duration: 21, delay: -6, sizePx: 10, color: '#2DD4BF', peak: 0.52, glyph: '★' },
  { left: '79.5%', drift: '22px', duration: 24, delay: -14, sizePx: 8, color: '#F0ABFC', peak: 0.48, glyph: '✦' },
  { left: '91.5%', drift: '-13px', duration: 20, delay: -11, sizePx: 9, color: '#4ADE80', peak: 0.5, glyph: '✦' },
  { left: '6%', drift: '24px', duration: 28, delay: -25, sizePx: 6, color: '#E9D5FF', peak: 0.42, glyph: '✦', hideOnNarrow: true },
  { left: '48%', drift: '-5px', duration: 29, delay: -27, sizePx: 5, color: '#BAE6FD', peak: 0.4, glyph: '✦', hideOnNarrow: true },
  { left: '74%', drift: '8px', duration: 30, delay: -29, sizePx: 6, color: '#FECDD3', peak: 0.41, glyph: '✦', hideOnNarrow: true },
];

type SnowSpec = {
  left: string;
  drift: string;
  duration: number;
  delay: number;
  sizePx: number;
  opacity: number;
};

const SNOW: SnowSpec[] = [
  { left: '3%', drift: '-8px', duration: 28, delay: -4, sizePx: 4, opacity: 0.55 },
  { left: '6%', drift: '11px', duration: 31, delay: -18, sizePx: 3, opacity: 0.48 },
  { left: '10%', drift: '10px', duration: 34, delay: -20, sizePx: 3, opacity: 0.42 },
  { left: '14%', drift: '12px', duration: 32, delay: -18, sizePx: 3, opacity: 0.45 },
  { left: '18%', drift: '-11px', duration: 36, delay: -12, sizePx: 4, opacity: 0.48 },
  { left: '22%', drift: '-14px', duration: 35, delay: -9, sizePx: 5, opacity: 0.5 },
  { left: '26%', drift: '7px', duration: 31, delay: -24, sizePx: 2, opacity: 0.38 },
  { left: '31%', drift: '6px', duration: 30, delay: -22, sizePx: 3, opacity: 0.4 },
  { left: '35%', drift: '-13px', duration: 33, delay: -8, sizePx: 4, opacity: 0.5 },
  { left: '39%', drift: '-10px', duration: 33, delay: -6, sizePx: 4, opacity: 0.52 },
  { left: '44%', drift: '14px', duration: 38, delay: -16, sizePx: 3, opacity: 0.4 },
  { left: '48%', drift: '16px', duration: 29, delay: -14, sizePx: 3, opacity: 0.38 },
  { left: '52%', drift: '-7px', duration: 32, delay: -5, sizePx: 5, opacity: 0.46 },
  { left: '56%', drift: '-6px', duration: 36, delay: -25, sizePx: 5, opacity: 0.48 },
  { left: '60%', drift: '9px', duration: 35, delay: -19, sizePx: 3, opacity: 0.44 },
  { left: '64%', drift: '10px', duration: 31, delay: -11, sizePx: 4, opacity: 0.42 },
  { left: '68%', drift: '-15px', duration: 39, delay: -27, sizePx: 2, opacity: 0.36 },
  { left: '72%', drift: '-12px', duration: 34, delay: -3, sizePx: 3, opacity: 0.5 },
  { left: '76%', drift: '13px', duration: 36, delay: -21, sizePx: 4, opacity: 0.43 },
  { left: '80%', drift: '8px', duration: 37, delay: -20, sizePx: 4, opacity: 0.44 },
  { left: '84%', drift: '-9px', duration: 33, delay: -7, sizePx: 3, opacity: 0.4 },
  { left: '87%', drift: '7px', duration: 35, delay: -21, sizePx: 3, opacity: 0.38 },
  { left: '92%', drift: '11px', duration: 40, delay: -29, sizePx: 3, opacity: 0.37 },
  { left: '96%', drift: '-10px', duration: 34, delay: -13, sizePx: 4, opacity: 0.45 },
  { left: '17%', drift: '14px', duration: 40, delay: -28, sizePx: 3, opacity: 0.35 },
  { left: '53%', drift: '-16px', duration: 38, delay: -15, sizePx: 4, opacity: 0.46 },
  { left: '77%', drift: '11px', duration: 35, delay: -30, sizePx: 3, opacity: 0.36 },
  { left: '1%', drift: '6px', duration: 42, delay: -31, sizePx: 2, opacity: 0.33 },
  { left: '8%', drift: '-5px', duration: 41, delay: -17, sizePx: 3, opacity: 0.4 },
  { left: '21%', drift: '18px', duration: 37, delay: -10, sizePx: 4, opacity: 0.47 },
  { left: '37%', drift: '9px', duration: 43, delay: -33, sizePx: 2, opacity: 0.34 },
  { left: '49%', drift: '-12px', duration: 36, delay: -6, sizePx: 5, opacity: 0.49 },
  { left: '59%', drift: '15px', duration: 39, delay: -22, sizePx: 3, opacity: 0.41 },
  { left: '71%', drift: '-8px', duration: 44, delay: -35, sizePx: 2, opacity: 0.32 },
  { left: '83%', drift: '12px', duration: 38, delay: -14, sizePx: 4, opacity: 0.46 },
  { left: '91%', drift: '-6px', duration: 41, delay: -26, sizePx: 3, opacity: 0.39 },
  { left: '98%', drift: '8px', duration: 40, delay: -18, sizePx: 3, opacity: 0.42 },
  /* Faster, smaller flakes — reads as “busy” without cluttering */
  { left: '12%', drift: '-4px', duration: 22, delay: -5, sizePx: 2, opacity: 0.48 },
  { left: '28%', drift: '5px', duration: 24, delay: -11, sizePx: 2, opacity: 0.44 },
  { left: '46%', drift: '-6px', duration: 21, delay: -2, sizePx: 2, opacity: 0.5 },
  { left: '63%', drift: '4px', duration: 23, delay: -16, sizePx: 2, opacity: 0.43 },
  { left: '79%', drift: '-5px', duration: 25, delay: -8, sizePx: 2, opacity: 0.46 },
  { left: '94%', drift: '6px', duration: 22, delay: -19, sizePx: 2, opacity: 0.4 },
];

export function QuoteSectionSky(): React.ReactElement {
  return (
    <div
      className="quote-section-sky pointer-events-none absolute inset-x-0 top-0 z-0 min-h-[32rem] overflow-hidden motion-reduce:hidden md:min-h-[40rem]"
      aria-hidden
    >
      {STARS.map((s, i) => {
        const boosted = Math.min(0.94, s.peak * 1.28);
        return (
          <span
            key={`qs-star-${i}`}
            className={`absolute top-0 select-none will-change-transform ${
              s.hideOnNarrow ? 'hidden sm:inline' : ''
            }`}
            style={{
              left: s.left,
              ['--star-drift' as string]: s.drift,
              ['--star-o' as string]: String(boosted),
              fontSize: `${s.sizePx + 1}px`,
              color: s.color,
              textShadow:
                '0 0 14px rgba(255,255,255,0.85), 0 0 26px rgba(255,255,255,0.45), 0 0 3px rgba(255,255,255,0.95)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
              animationName: 'quoteStarFall',
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
            }}
          >
            {s.glyph}
          </span>
        );
      })}
      {SNOW.map((s, i) => (
        <span
          key={`qs-snow-${i}`}
          className="absolute top-0 select-none rounded-full will-change-transform"
          style={{
            left: s.left,
            width: `${s.sizePx}px`,
            height: `${s.sizePx}px`,
            backgroundColor: `rgba(248, 250, 252, ${s.opacity})`,
            boxShadow: '0 0 6px rgba(255,255,255,0.35)',
            ['--snow-drift' as string]: s.drift,
            ['--snow-o' as string]: String(s.opacity),
            animationName: 'quoteSnowFall',
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        />
      ))}
    </div>
  );
}
