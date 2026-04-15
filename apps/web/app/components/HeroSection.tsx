'use client';

import Image from 'next/image';

import { FacebookFollowButton } from './FacebookFollowButton';
import { FloatingEmojis } from './FloatingEmojis';

type Props = {
  headline: string;
  subheadline: string;
  cta: string;
  isBengali: boolean;
};

export function HeroSection({
  headline,
  subheadline,
  cta,
  isBengali,
}: Props): React.ReactElement {
  return (
    <section className="relative overflow-hidden mesh-hero px-4 pb-0 pt-10 sm:pt-14">
      <FloatingEmojis />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt=""
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
        <p
          className={`mt-6 max-w-2xl text-lg leading-relaxed text-text-soft sm:text-xl ${
            isBengali ? 'font-bengali' : ''
          }`}
        >
          {subheadline}
        </p>
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
