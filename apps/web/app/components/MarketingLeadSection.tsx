import type { ReactElement, ReactNode } from 'react';

import { NewsletterLeadBlock } from './NewsletterLeadBlock';
import { VisitorFeedbackForm } from './VisitorFeedbackForm';

import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

function PremiumLeadSurface({
  children,
  curveIdSuffix,
}: {
  children: ReactNode;
  curveIdSuffix: string;
}): ReactElement {
  const gid = `ml-${curveIdSuffix}`;
  return (
    <div className="group relative rounded-[2rem] border border-white/35 bg-gradient-to-br from-[#eef6ff] via-[#f4f0ff] to-[#e8fff7] p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.28)] ring-1 ring-white/70 sm:p-8">
      {/*
        Clip only the decorative blobs/SVG so the country dropdown (in children) is not cut off.
        overflow-hidden on the whole card hid absolutely positioned popovers.
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]" aria-hidden>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-300/45 via-indigo-300/40 to-fuchsia-300/45 blur-3xl transition duration-[800ms] group-hover:opacity-95" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/35 via-sky-300/30 to-blue-300/35 blur-3xl" />
        <svg
          className="marketing-lead-curves absolute -right-8 top-6 h-36 w-[min(100%,280px)] text-sky-400/35 sm:right-0 sm:h-44"
          viewBox="0 0 320 140"
          fill="none"
        >
          <defs>
            <linearGradient id={`${gid}-a`} x1="0" y1="0" x2="320" y2="140" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgb(14 165 233)" stopOpacity="0.5" />
              <stop offset="0.5" stopColor="rgb(99 102 241)" stopOpacity="0.4" />
              <stop offset="1" stopColor="rgb(217 70 239)" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id={`${gid}-b`} x1="320" y1="0" x2="0" y2="140" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgb(45 212 191)" stopOpacity="0.35" />
              <stop offset="1" stopColor="rgb(59 130 246)" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d="M-20 96 C 48 22, 120 118, 198 52 S 320 12, 340 108"
            stroke={`url(#${gid}-a)`}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M-12 118 C 72 44, 138 132, 220 72 S 312 28, 352 96"
            stroke={`url(#${gid}-b)`}
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      </div>
      <div className="relative z-10 min-h-0 overflow-visible">{children}</div>
    </div>
  );
}

/**
 * Newsletter signup + visitor feedback for BN/EN landings (posts to Nest `POST /api/v1/leads`).
 * Visual language matches `NewsletterSignupModal`: light mesh, soft orbs, sky–indigo–fuchsia accents.
 */
export function MarketingLeadSection({ content }: Props): ReactElement {
  const isBn = content.locale === 'bn';

  return (
    <section
      className="relative overflow-x-hidden border-t border-slate-200/70 px-4 py-16 sm:py-20"
      aria-labelledby="marketing-lead-heading marketing-feedback-heading"
    >
      <div className="pointer-events-none absolute inset-0 mesh-cta opacity-[0.92]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent"
        aria-hidden
      />
      <svg
        aria-hidden
        className="marketing-lead-curves pointer-events-none absolute -left-24 top-1/4 hidden h-48 w-72 text-emerald-400/25 md:block lg:left-0"
        viewBox="0 0 400 200"
        fill="none"
      >
        <defs>
          <linearGradient id="ml-bg-wave" x1="0" y1="100" x2="400" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgb(45 212 191)" stopOpacity="0.45" />
            <stop offset="1" stopColor="rgb(129 140 248)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path
          d="M0 120 C 80 40, 160 180, 260 80 S 380 20, 420 140"
          stroke="url(#ml-bg-wave)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <svg
        aria-hidden
        className="marketing-lead-curves pointer-events-none absolute -right-16 bottom-8 hidden h-40 w-64 text-fuchsia-400/20 md:block"
        style={{ animationDelay: '-6s' }}
        viewBox="0 0 360 180"
        fill="none"
      >
        <defs>
          <linearGradient id="ml-bg-wave-2" x1="360" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgb(217 70 239)" stopOpacity="0.35" />
            <stop offset="1" stopColor="rgb(56 189 248)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path
          d="M-20 40 C 60 120, 140 20, 240 100 S 340 160, 400 48"
          stroke="url(#ml-bg-wave-2)"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-10 mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:gap-12">
        <article>
          <PremiumLeadSurface curveIdSuffix="sub">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-600">ParentingMyKid</p>
            <h2
              id="marketing-lead-heading"
              className={`mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl ${
                isBn ? 'font-bengali leading-[1.25]' : ''
              }`}
            >
              {content.leadCapture.title}
            </h2>
            <p
              className={`mt-3 text-sm leading-relaxed text-slate-700 sm:text-base ${
                isBn ? 'font-bengali leading-[1.85]' : ''
              }`}
            >
              {content.leadCapture.subtitle}
            </p>
            <div className="mt-6">
              <NewsletterLeadBlock content={content} />
            </div>
          </PremiumLeadSurface>
        </article>

        <article>
          <PremiumLeadSurface curveIdSuffix="fb">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-600">ParentingMyKid</p>
            <h2
              id="marketing-feedback-heading"
              className={`mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl ${
                isBn ? 'font-bengali leading-[1.25]' : ''
              }`}
            >
              {content.feedback.title}
            </h2>
            <p
              className={`mt-3 text-sm leading-relaxed text-slate-700 sm:text-base ${
                isBn ? 'font-bengali leading-[1.85]' : ''
              }`}
            >
              {content.feedback.subtitle}
            </p>
            <div className="mt-6 rounded-2xl border border-white/70 bg-white/65 p-4 shadow-[0_16px_44px_-28px_rgba(30,64,175,0.35)] sm:p-5">
              <VisitorFeedbackForm content={content} />
            </div>
          </PremiumLeadSurface>
        </article>
      </div>
    </section>
  );
}
