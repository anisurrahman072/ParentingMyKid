'use client';

import type { LandingContent } from '@/lib/content';

import { FacebookCTA } from './FacebookCTA';
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

export function Landing({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';

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
        <StarSectionDivider />
        <div data-scroll-chapter="4">
          <QuoteSection content={content} />
        </div>
        <div data-scroll-chapter="5">
          <ImageShowcase content={content} />
        </div>
        <div data-scroll-chapter="6">
          <FacebookCTA content={content} />
        </div>
      </main>
      <div data-scroll-chapter="7">
        <Footer content={content} />
      </div>
    </div>
  );
}
