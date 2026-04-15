'use client';

import { FACEBOOK_PAGE_URL } from '@/lib/constants';

type Props = {
  label: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
};

export function FacebookFollowButton({
  label,
  size = 'md',
  className = '',
}: Props): React.ReactElement {
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
