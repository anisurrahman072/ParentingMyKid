'use client';

import Image from 'next/image';

import { FacebookFollowButton } from './FacebookFollowButton';

type Props = {
  followLabel: string;
};

export function StickyTopBar({ followLabel }: Props): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/[0.97] backdrop-blur-none md:bg-white/75 md:backdrop-blur-md">
      {/*
        Mobile: stack brand + CTA vertically so the follow pill never overlaps
        the title (Bengali labels wrap to two lines and need full width).
        sm+: single row with space-between.
      */}
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/logo.png"
            alt="ParentingMyKid"
            width={52}
            height={52}
            className="h-10 w-10 shrink-0 rounded-2xl object-contain drop-shadow-md sm:h-12 sm:w-12"
            priority
          />
          <span className="min-w-0 truncate text-base font-black tracking-tight text-text-main sm:text-xl">
            ParentingMyKid
          </span>
        </div>
        <FacebookFollowButton
          label={followLabel}
          size="md"
          className="w-full shrink-0 justify-center py-2.5 text-sm leading-snug sm:w-auto sm:py-3 sm:text-base sm:leading-normal"
        />
      </div>
    </header>
  );
}
