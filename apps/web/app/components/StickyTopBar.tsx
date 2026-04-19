'use client';

import Image from 'next/image';

import { FacebookFollowButton } from './FacebookFollowButton';
import { XPremiumCircleLink } from './XFollowButton';

type Props = {
  followLabel: string;
  followXAria: string;
};

export function StickyTopBar({ followLabel, followXAria }: Props): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/[0.97] backdrop-blur-none md:bg-white/75 md:backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Image
            src="/logo.png"
            alt="ParentingMyKid"
            width={52}
            height={52}
            className="h-11 w-11 shrink-0 rounded-2xl object-contain drop-shadow-md sm:h-12 sm:w-12"
            priority
          />
          <span className="min-w-0 font-wordmark text-lg font-extrabold leading-tight tracking-tight text-text-main antialiased md:text-xl">
            ParentingMyKid
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FacebookFollowButton
            label={followLabel}
            variant="icon"
            className="md:hidden"
          />
          <XPremiumCircleLink
            ariaLabel={followXAria}
            className="h-11 w-11 md:hidden"
          />
          <FacebookFollowButton
            label={followLabel}
            size="md"
            className="hidden md:inline-flex"
          />
          <XPremiumCircleLink
            ariaLabel={followXAria}
            className="hidden h-11 w-11 md:inline-flex"
          />
        </div>
      </div>
    </header>
  );
}
