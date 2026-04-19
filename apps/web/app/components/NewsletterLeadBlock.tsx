'use client';

import { useEffect, useState } from 'react';

import { LeadCaptureForm } from './LeadCaptureForm';

import type { LandingContent } from '@/lib/content';
import {
  getNewsletterSubscriptionMeta,
  isNewsletterSubscribedClient,
  NEWSLETTER_SUBSCRIBED_EVENT,
  type NewsletterSubscriptionMeta,
} from '@/lib/newsletter-state';

type Props = {
  content: LandingContent;
};

function formatMemberSince(iso: string | null, locale: 'bn' | 'en'): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}

/**
 * Bottom “Stay in the loop” area: full form, or a thank-you card if already subscribed (same storage as the scroll modal).
 */
export function NewsletterLeadBlock({ content }: Props): React.ReactElement {
  const [subscribed, setSubscribed] = useState(false);
  const [meta, setMeta] = useState<NewsletterSubscriptionMeta>({
    email: null,
    subscribedAtIso: null,
  });
  const isBn = content.locale === 'bn';
  const t = content.leadCapture;

  useEffect(() => {
    const sync = (): void => {
      setSubscribed(isNewsletterSubscribedClient());
      setMeta(getNewsletterSubscriptionMeta());
    };
    sync();
    window.addEventListener(NEWSLETTER_SUBSCRIBED_EVENT, sync);
    return () => window.removeEventListener(NEWSLETTER_SUBSCRIBED_EVENT, sync);
  }, []);

  if (subscribed) {
    const since = formatMemberSince(meta.subscribedAtIso, content.locale);
    return (
      <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-white/95 via-white/90 to-sky-50/80 p-5 text-center shadow-[0_16px_44px_-28px_rgba(30,64,175,0.38)] ring-1 ring-white/80 sm:p-7">
        <p className="text-4xl" aria-hidden>
          ✨
        </p>
        <h3
          className={`mt-3 text-lg font-black text-slate-900 sm:text-xl ${isBn ? 'font-bengali' : ''}`}
        >
          {t.subscribedTitle}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed text-slate-600 sm:text-base ${isBn ? 'font-bengali' : ''}`}>
          {t.subscribedBody}
        </p>
        {meta.email ? (
          <div
            className={`mt-5 rounded-2xl border border-sky-200/80 bg-white/90 px-4 py-4 text-left shadow-inner shadow-sky-100/50 sm:px-5 ${isBn ? 'font-bengali' : ''}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {t.subscribedEmailLabel}
            </p>
            <p className="mt-1.5 break-all text-base font-semibold text-slate-900">{meta.email}</p>
            {since ? (
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">{t.subscribedMemberSinceLabel}</span>
                <span className="mx-1.5">·</span>
                <time dateTime={meta.subscribedAtIso ?? undefined}>{since}</time>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl border border-white/70 bg-white/70 p-4 text-slate-800 shadow-[0_16px_44px_-28px_rgba(30,64,175,0.45)] sm:p-5 ${isBn ? 'font-bengali' : ''}`}
      >
        <p className="text-base font-bold text-slate-900">{t.modalWhyJoinTitle}</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed sm:text-[15px]">
          {t.modalBenefits.map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-semibold text-slate-800">{t.modalClosingLine}</p>
      </div>
      <LeadCaptureForm content={content} variant="full" />
    </div>
  );
}
