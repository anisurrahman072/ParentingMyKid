'use client';

import Image from 'next/image';

import { FacebookFollowButton } from './FacebookFollowButton';

type Props = {
  followLabel: string;
};

export function StickyTopBar({ followLabel }: Props): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/[0.97] backdrop-blur-none md:bg-white/75 md:backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="ParentingMyKid"
            width={52}
            height={52}
            className="h-12 w-12 rounded-2xl object-contain drop-shadow-md"
            priority
          />
          <span className="text-lg font-black tracking-tight text-text-main sm:text-xl">
            ParentingMyKid
          </span>
        </div>
        <FacebookFollowButton label={followLabel} size="md" />
      </div>
    </header>
  );
}
