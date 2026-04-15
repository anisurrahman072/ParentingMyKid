'use client';

import type { LandingContent } from '@/lib/content';

import { FacebookCTA } from './FacebookCTA';
import { Footer } from './Footer';
import { HeroSection } from './HeroSection';
import { ImageShowcase } from './ImageShowcase';
import { ProblemSection } from './ProblemSection';
import { QuoteSection } from './QuoteSection';
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
      <main>
        <HeroSection
          headline={content.hero.headline}
          subheadline={content.hero.subheadline}
          cta={content.hero.cta}
          isBengali={isBn}
        />
        <StatsBar content={content} />
        <ProblemSection content={content} />
        <TopicBentoGrid content={content} />
        <QuoteSection content={content} />
        <ImageShowcase content={content} />
        <FacebookCTA content={content} />
      </main>
      <Footer content={content} />
    </div>
  );
}
