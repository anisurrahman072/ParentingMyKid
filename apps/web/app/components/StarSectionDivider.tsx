'use client';

/**
 * Thin light rule with centered star cluster — bridges light sections (e.g. bento) and the dark quote block.
 */
export function StarSectionDivider(): React.ReactElement {
  return (
    <div className="relative bg-bg-base px-4 py-2.5 md:py-3" aria-hidden>
      <div className="relative mx-auto max-w-4xl">
        {/* Hairline — soft violet/slate so it reads on bg-bg-base without going heavy */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-300/70 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-full bg-bg-base px-5 py-1.5 shadow-[0_0_0_1px_rgba(148,163,184,0.14)]">
            <span className="select-none text-[0.5rem] leading-none text-brand-teal/65">✦</span>
            <span className="select-none text-[0.62rem] leading-none text-brand-purple/55">✦</span>
            <span className="select-none text-[0.5rem] leading-none text-brand-pink/60">✦</span>
          </div>
        </div>

        {/* Micro sparkles — echo TopicBento / hero stars without motion */}
        <span className="pointer-events-none absolute left-[10%] top-1/2 hidden -translate-y-[150%] select-none text-[0.4rem] text-brand-teal/35 sm:block">
          ✦
        </span>
        <span className="pointer-events-none absolute right-[12%] top-1/2 hidden -translate-y-[120%] select-none text-[0.35rem] text-brand-purple/30 sm:block">
          ✦
        </span>
        <span className="pointer-events-none absolute left-[18%] top-1/2 hidden translate-y-[120%] select-none text-[0.35rem] text-brand-pink/28 sm:block">
          ✦
        </span>
        <span className="pointer-events-none absolute right-[16%] top-1/2 hidden translate-y-[140%] select-none text-[0.4rem] text-cyan-500/25 sm:block">
          ✦
        </span>
      </div>
    </div>
  );
}
