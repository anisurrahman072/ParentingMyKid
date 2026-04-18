import { NewsletterLeadBlock } from './NewsletterLeadBlock';
import { VisitorFeedbackForm } from './VisitorFeedbackForm';

import type { LandingContent } from '@/lib/content';

type Props = {
  content: LandingContent;
};

/**
 * Newsletter signup + visitor feedback for BN/EN landings (posts to Nest `POST /api/v1/leads`).
 */
export function MarketingLeadSection({ content }: Props): React.ReactElement {
  const isBn = content.locale === 'bn';

  return (
    <section
      className="relative border-t border-white/10 bg-gradient-to-b from-bg-base to-[#0f1729] px-4 py-20"
      aria-labelledby="marketing-lead-heading"
    >
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2
            id="marketing-lead-heading"
            className={`text-3xl font-black tracking-tight text-text-main sm:text-4xl ${
              isBn ? 'font-bengali' : ''
            }`}
          >
            {content.leadCapture.title}
          </h2>
          <p
            className={`mt-3 text-lg leading-relaxed text-text-soft ${isBn ? 'font-bengali' : ''}`}
          >
            {content.leadCapture.subtitle}
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <NewsletterLeadBlock content={content} />
          </div>
        </div>
        <div>
          <h2
            className={`text-3xl font-black tracking-tight text-text-main sm:text-4xl ${
              isBn ? 'font-bengali' : ''
            }`}
          >
            {content.feedback.title}
          </h2>
          <p
            className={`mt-3 text-lg leading-relaxed text-text-soft ${isBn ? 'font-bengali' : ''}`}
          >
            {content.feedback.subtitle}
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <VisitorFeedbackForm content={content} />
          </div>
        </div>
      </div>
    </section>
  );
}
