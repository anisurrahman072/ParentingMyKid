'use client';

import { useEffect, useState } from 'react';

import { LeadCaptureForm } from './LeadCaptureForm';

import type { LandingContent } from '@/lib/content';
import {
  isNewsletterSubscribedClient,
  NEWSLETTER_SUBSCRIBED_EVENT,
} from '@/lib/newsletter-state';

type Props = {
  content: LandingContent;
};

/**
 * Bottom “Stay in the loop” area: full form, or a thank-you card if already subscribed (same storage as the scroll modal).
 */
export function NewsletterLeadBlock({ content }: Props): React.ReactElement {
  const [subscribed, setSubscribed] = useState(false);
  const isBn = content.locale === 'bn';
  const t = content.leadCapture;

  useEffect(() => {
    setSubscribed(isNewsletterSubscribedClient());
    const onSub = (): void => setSubscribed(true);
    window.addEventListener(NEWSLETTER_SUBSCRIBED_EVENT, onSub);
    return () => window.removeEventListener(NEWSLETTER_SUBSCRIBED_EVENT, onSub);
  }, []);

  if (subscribed) {
    return (
      <div className="rounded-3xl border border-brand-mint/35 bg-gradient-to-br from-brand-mint/15 via-white/10 to-brand-purple/10 p-8 text-center shadow-lg shadow-brand-mint/10">
        <p className="text-4xl" aria-hidden>
          ✨
        </p>
        <h3
          className={`mt-3 text-xl font-black text-text-main sm:text-2xl ${isBn ? 'font-bengali' : ''}`}
        >
          {t.subscribedTitle}
        </h3>
        <p className={`mt-3 text-base leading-relaxed text-text-soft ${isBn ? 'font-bengali' : ''}`}>
          {t.subscribedBody}
        </p>
      </div>
    );
  }

  return <LeadCaptureForm content={content} variant="full" />;
}
