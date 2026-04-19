'use client';

import { useId } from 'react';

import { TWITTER_X_PAGE_URL } from '@/lib/constants';

type Props = {
  ariaLabel: string;
  /** Outer size — match the adjacent Facebook control in each layout. */
  className?: string;
  /** Gentle side-to-side motion (e.g. stats rhythm pillar). */
  swing?: boolean;
  href?: string;
};

/**
 * Circular X (Twitter) control: dark disc, subtle white angle lines, gradient X mark with glow.
 */
export function XPremiumCircleLink({
  ariaLabel,
  className = '',
  swing = false,
  href = TWITTER_X_PAGE_URL,
}: Props): React.ReactElement {
  const uid = useId();
  const gradId = `x-premium-grad-${uid.replace(/:/g, '')}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      style={{ transformOrigin: '50% 0%' }}
      className={`group relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-950 text-white shadow-[0_10px_28px_-6px_rgba(0,0,0,0.45),0_2px_10px_rgba(0,0,0,0.2)] ring-2 ring-white/25 ring-offset-2 ring-offset-transparent transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 motion-reduce:transition-none ${swing ? 'x-badge-swing' : ''} ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: [
            'repeating-linear-gradient(135deg, transparent 0, transparent 5px, rgba(255,255,255,0.09) 5px, rgba(255,255,255,0.09) 6px)',
            'repeating-linear-gradient(45deg, transparent 0, transparent 7px, rgba(255,255,255,0.06) 7px, rgba(255,255,255,0.06) 8px)',
          ].join(','),
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-white/[0.04]"
      />
      <svg
        className="relative z-10 h-[58%] w-[58%] motion-reduce:animate-none x-mark-premium"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#f4f4f5" />
            <stop offset="72%" stopColor="#d4d4d8" />
            <stop offset="100%" stopColor="#fafafa" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gradId})`}
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
    </a>
  );
}
