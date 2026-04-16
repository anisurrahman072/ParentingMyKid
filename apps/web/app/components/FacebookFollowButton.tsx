'use client';

import { FACEBOOK_PAGE_URL } from '@/lib/constants';

type Props = {
  label: string;
  size?: 'md' | 'lg' | 'xl';
  /** Compact round control with Facebook mark — use on narrow layouts (e.g. mobile top bar). */
  variant?: 'default' | 'icon';
  className?: string;
};

/** White Facebook “f” mark — shared with stats rhythm badge and icon buttons. */
export function FacebookMarkIcon({
  className = 'h-[1.35rem] w-[1.35rem]',
}: {
  className?: string;
} = {}): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0014.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z" />
    </svg>
  );
}

export function FacebookFollowButton({
  label,
  size = 'md',
  variant = 'default',
  className = '',
}: Props): React.ReactElement {
  if (variant === 'icon') {
    return (
      <a
        href={FACEBOOK_PAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-purple text-white shadow-md transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple ${className}`}
      >
        <FacebookMarkIcon />
      </a>
    );
  }

  const sizeClasses =
    size === 'xl'
      ? 'px-10 py-5 text-xl'
      : size === 'lg'
        ? 'px-8 py-4 text-lg'
        : 'px-6 py-3 text-base';

  return (
    <a
      href={FACEBOOK_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-teal to-brand-purple font-bold text-white shadow-lg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple ${sizeClasses} animate-glow-pulse ${className}`}
    >
      {label}
    </a>
  );
}
