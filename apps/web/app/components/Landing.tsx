'use client';

import type { LandingContent } from '@/lib/content';

import { FacebookCTA } from './FacebookCTA';
import { DeeniLearningSection } from './DeeniLearningSection';
import { Footer } from './Footer';
import { HeroSection } from './HeroSection';
import { ImageShowcase } from './ImageShowcase';
import { ProblemSection } from './ProblemSection';
import { QuoteSection } from './QuoteSection';
import { ScrollCompanion } from './ScrollCompanion';
import { StarSectionDivider } from './StarSectionDivider';
import { StatsBar } from './StatsBar';
import { StickyTopBar } from './StickyTopBar';
import { TopicBentoGrid } from './TopicBentoGrid';

type Props = {
  content: LandingContent;
};

function IslamicSectionWaveDivider(): React.ReactElement {
  return (
    <div className="relative -mb-3 -mt-2 h-14 overflow-hidden md:h-16" aria-hidden>
      <svg className="h-full w-full" viewBox="0 0 1440 140" preserveAspectRatio="none">
        <defs>
          <linearGradient
            id="islamic-wave-fill"
            x1="0"
            y1="0"
            x2="1440"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#FFFBEB" stopOpacity="0.98" />
            <stop offset="0.5" stopColor="#FFFBEB" stopOpacity="0.98" />
            <stop offset="1" stopColor="#FFFBEB" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient
            id="islamic-wave-stroke"
            x1="0"
            y1="0"
            x2="1440"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#F59E0B" stopOpacity="0.32" />
            <stop offset="0.5" stopColor="#FBBF24" stopOpacity="0.4" />
            <stop offset="1" stopColor="#F59E0B" stopOpacity="0.32" />
          </linearGradient>
        </defs>
        <path
          d="M0 32 C 160 88, 300 8, 480 50 C 650 88, 820 16, 1010 54 C 1180 90, 1310 30, 1440 62 V140 H0 Z"
          fill="url(#islamic-wave-fill)"
        />
        <path
          d="M0 32 C 160 88, 300 8, 480 50 C 650 88, 820 16, 1010 54 C 1180 90, 1310 30, 1440 62"
          fill="none"
          stroke="url(#islamic-wave-stroke)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export function Landing({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';
  /** BN inserts the Deeni section as its own scroll chapter; EN skips it, so later indices shift. */
  const ch = {
    quote: isBn ? 5 : 4,
    showcase: isBn ? 6 : 5,
    facebook: isBn ? 7 : 6,
    footer: isBn ? 8 : 7,
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <StickyTopBar followLabel={content.hero.cta} />
      <ScrollCompanion content={content} />
      <main>
        <div data-scroll-chapter="0">
          <HeroSection
            headline={content.hero.headline}
            subheadline={content.hero.subheadline}
            cta={content.hero.cta}
            isBengali={isBn}
          />
        </div>
        <div data-scroll-chapter="1">
          <StatsBar content={content} />
        </div>
        <div data-scroll-chapter="2">
          <ProblemSection content={content} />
        </div>
        <div data-scroll-chapter="3">
          <TopicBentoGrid content={content} />
        </div>
        {isBn ? (
          <div data-scroll-chapter="4">
            <IslamicSectionWaveDivider />
            <DeeniLearningSection />
          </div>
        ) : null}
        <StarSectionDivider />
        <div data-scroll-chapter={String(ch.quote)}>
          <QuoteSection content={content} />
        </div>
        <div data-scroll-chapter={String(ch.showcase)}>
          <ImageShowcase content={content} />
        </div>
        <div data-scroll-chapter={String(ch.facebook)}>
          <FacebookCTA content={content} />
        </div>
      </main>
      <div data-scroll-chapter={String(ch.footer)}>
        <Footer content={content} />
      </div>
    </div>
  );
}
