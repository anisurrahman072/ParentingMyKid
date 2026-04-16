'use client';

import Image from 'next/image';

import type { HeroSubheadline } from '@/lib/content';

import { FacebookFollowButton } from './FacebookFollowButton';
import { FallingStars } from './FallingStars';
import { FloatingEmojis } from './FloatingEmojis';

type Props = {
  headline: string;
  subheadline: HeroSubheadline;
  cta: string;
  isBengali: boolean;
};

export function HeroSection({ headline, subheadline, cta, isBengali }: Props): React.ReactElement {
  return (
    <section className="relative overflow-hidden mesh-hero px-4 pb-0 pt-10 sm:pt-14">
      <FallingStars />
      <FloatingEmojis />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt={isBengali ? 'ParentingMyKid লোগো' : 'ParentingMyKid logo'}
          width={120}
          height={120}
          className="mb-6 h-28 w-28 rounded-3xl object-contain drop-shadow-xl sm:h-32 sm:w-32"
          priority
        />
        <h1
          className={`text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl ${
            isBengali ? 'font-bengali' : ''
          }`}
        >
          <span className="bg-gradient-to-br from-brand-teal via-brand-purple to-brand-pink bg-clip-text text-transparent [background-size:200%_auto] animate-shimmer-text">
            {headline}
          </span>
        </h1>
        <div
          className={`mt-6 max-w-2xl space-y-1 text-center ${
            isBengali ? 'font-bengali' : ''
          }`}
        >
          <p className="text-[0.95rem] leading-snug text-text-main sm:text-lg sm:leading-snug">
            <span className="inline-flex items-center gap-1.5 align-middle">
              <span className="rounded-full border border-white/70 bg-white/55 px-2.5 py-0.5 text-xs font-semibold tracking-tight text-brand-teal shadow-sm shadow-brand-teal/10 backdrop-blur-sm sm:px-3 sm:text-[0.8125rem]">
                {subheadline.brand}
              </span>
            </span>
            <span className="text-text-soft/80"> — </span>
            <span className="text-text-soft">{subheadline.intro}</span>
          </p>
          <p className="text-[0.9rem] font-medium leading-snug tracking-tight text-text-main/90 sm:text-base">
            {subheadline.scope}
          </p>
          <p className="text-[0.95rem] leading-snug text-text-soft sm:text-lg sm:leading-snug">
            {subheadline.payoffLead}
            <span className="bg-gradient-to-r from-brand-teal via-brand-purple to-brand-pink bg-clip-text font-semibold text-transparent">
              {subheadline.payoffAccent}
            </span>
            {subheadline.payoffTrail}
          </p>
        </div>
        <div className="mt-10">
          <FacebookFollowButton label={cta} size="lg" />
        </div>
      </div>
      <WaveDivider className="mt-16 text-bg-base" />
    </section>
  );
}

function WaveDivider({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={`relative mt-8 w-full ${className}`}
      viewBox="0 0 1440 80"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M0 40L60 35C120 30 240 20 360 23.3C480 27 600 43 720 46.7C840 50 960 40 1080 33.3C1200 27 1320 23 1380 21.7L1440 20V80H0V40Z" />
    </svg>
  );
}
