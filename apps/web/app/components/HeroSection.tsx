'use client';

import Image from 'next/image';

import type { HeroSubheadline } from '@/lib/content';

import { FacebookFollowButton } from './FacebookFollowButton';
import { XPremiumCircleLink } from './XFollowButton';

/** English hero: one color per topic word (teal → emerald → purple → fuchsia → pink). */
const HERO_TOPIC_WORD_CLASSES = [
  'text-brand-teal',
  'text-emerald-600',
  'text-brand-purple',
  'text-fuchsia-600',
  'text-brand-pink',
] as const;
import { FallingStars } from './FallingStars';
import { FloatingEmojis } from './FloatingEmojis';

type Props = {
  headline: string;
  subheadline: HeroSubheadline;
  cta: string;
  followXAria: string;
  isBengali: boolean;
};

export function HeroSection({
  headline,
  subheadline,
  cta,
  followXAria,
  isBengali,
}: Props): React.ReactElement {
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
        <div className={`mt-6 max-w-2xl text-center ${isBengali ? 'font-bengali' : ''}`}>
          {isBengali ? (
            <p className="text-[0.95rem] leading-snug text-text-main sm:text-lg sm:leading-snug">
              <HeroBrandBadge>{subheadline.brand}</HeroBrandBadge>
              <span className="text-text-soft/80"> — </span>
              <span className="text-text-soft">
                {subheadline.intro}{' '}
                {subheadline.scopeHighlight != null &&
                subheadline.scopeLead != null &&
                subheadline.scopeTrail != null ? (
                  <>
                    {subheadline.scopeLead}
                    <span className="bg-gradient-to-r from-brand-teal via-brand-purple to-brand-pink bg-clip-text font-semibold text-transparent">
                      {subheadline.scopeHighlight}
                    </span>
                    {subheadline.scopeTrail}
                  </>
                ) : (
                  subheadline.scope
                )}
              </span>
            </p>
          ) : (
            <p className="text-[0.95rem] leading-snug text-text-main sm:text-lg sm:leading-snug">
              <HeroBrandBadge>{subheadline.brand}</HeroBrandBadge>
              <span className="text-text-soft/80"> — </span>
              <span className="text-text-soft">
                {[subheadline.intro, subheadline.scope, subheadline.payoffLead]
                  .filter((s) => s.length > 0)
                  .join(' ')}
                {subheadline.topicWords != null && subheadline.topicWords.length > 0 ? (
                  <>
                    <HeroEnglishTopicWords words={subheadline.topicWords} />
                    {subheadline.topicTrail ?? ''}
                  </>
                ) : (
                  <>
                    {' '}
                    <span className="bg-gradient-to-r from-brand-teal via-brand-purple to-brand-pink bg-clip-text font-semibold text-transparent">
                      {subheadline.payoffAccent}
                    </span>
                    {subheadline.payoffTrail}
                  </>
                )}
              </span>
            </p>
          )}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <FacebookFollowButton label={cta} size="lg" />
          <XPremiumCircleLink
            ariaLabel={followXAria}
            className="h-[3.25rem] w-[3.25rem] sm:h-14 sm:w-14"
          />
        </div>
      </div>
      <WaveDivider className="mt-16 text-bg-base" />
    </section>
  );
}

function HeroEnglishTopicWords({ words }: { words: string[] }): React.ReactElement {
  const n = words.length;
  return (
    <>
      {words.map((word, i) => {
        const colorClass = HERO_TOPIC_WORD_CLASSES[i % HERO_TOPIC_WORD_CLASSES.length];
        const sep = i < n - 1 ? (i === n - 2 ? ', and ' : ', ') : '';
        return (
          <span key={`${word}-${i}`}>
            <span className={`font-semibold ${colorClass}`}>{word}</span>
            {sep}
          </span>
        );
      })}
    </>
  );
}

function HeroBrandBadge({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span className="rounded-full border border-white/50 bg-gradient-to-br from-white via-teal-50/40 to-violet-50/35 px-2.5 py-0.5 font-wordmark text-xs font-extrabold tracking-tight shadow-[0_4px_18px_-4px_rgba(0,168,120,0.22),0_8px_28px_-12px_rgba(160,32,216,0.12),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(0,168,120,0.05)] ring-1 ring-brand-teal/15 backdrop-blur-xl sm:px-3 sm:text-[0.8125rem]">
        <span className="bg-gradient-to-r from-brand-teal via-emerald-600 to-teal-600 bg-clip-text text-transparent">
          {children}
        </span>
      </span>
    </span>
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
