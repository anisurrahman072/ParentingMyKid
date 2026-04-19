'use client';

import { useEffect, useState } from 'react';

import { CountrySelect } from './CountrySelect';
import { getMarketingApiBaseUrl } from '@/lib/marketing-api';
import {
  isNewsletterSubscribedClient,
  markNewsletterSubscribed,
  NEWSLETTER_SUBSCRIBED_EVENT,
} from '@/lib/newsletter-state';

import type { LandingContent } from '@/lib/content';

type Props = {
  content: Pick<LandingContent, 'feedback' | 'locale' | 'leadCapture'>;
};

export function VisitorFeedbackForm({ content }: Props): React.ReactElement {
  const base = getMarketingApiBaseUrl();
  const lang = content.locale;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [country, setCountry] = useState(() => (lang === 'bn' ? 'BD' : 'US'));
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [alreadyOnNewsletterList, setAlreadyOnNewsletterList] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const t = content.feedback;
  const countryLabel = content.leadCapture.countryLabel;
  const isBn = lang === 'bn';

  useEffect(() => {
    let cancelled = false;
    const fallback = lang === 'bn' ? 'BD' : 'US';
    fetch('/api/geo-country')
      .then((r) => r.json() as Promise<{ country?: string }>)
      .then((data) => {
        if (cancelled) return;
        const c = data.country?.trim().toUpperCase();
        if (c && /^[A-Z]{2}$/.test(c) && c !== 'XX') {
          setCountry(c);
        } else {
          setCountry(fallback);
        }
      })
      .catch(() => {
        if (!cancelled) setCountry(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    const sync = (): void => setAlreadyOnNewsletterList(isNewsletterSubscribedClient());
    sync();
    window.addEventListener(NEWSLETTER_SUBSCRIBED_EVENT, sync);
    return () => window.removeEventListener(NEWSLETTER_SUBSCRIBED_EVENT, sync);
  }, []);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!base) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    const emailTrim = email.trim();
    const countryTrim = country.trim();

    try {
      const res = await fetch(`${base}/api/v1/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTrim,
          name: name.trim() || undefined,
          language: lang,
          source: `feedback_${lang}`,
          message: message.trim(),
          country: countryTrim || undefined,
        }),
      });
      if (res.status !== 201) {
        setStatus('error');
        return;
      }

      if (newsletterOptIn && !isNewsletterSubscribedClient()) {
        const subRes = await fetch(`${base}/api/v1/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailTrim,
            name: name.trim() || undefined,
            country: countryTrim || undefined,
            language: lang,
            source: `feedback_newsletter_optin_${lang}`,
          }),
        });
        if (subRes.status === 201 || subRes.status === 409) {
          markNewsletterSubscribed(emailTrim);
        }
      }

      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
      setNewsletterOptIn(false);
    } catch {
      setStatus('error');
    }
  }

  if (!base) {
    return (
      <p className={`text-sm text-amber-700 ${isBn ? 'font-bengali' : ''}`} role="alert">
        {t.configError}
      </p>
    );
  }

  if (status === 'success') {
    return (
      <p className={`text-sm font-medium text-emerald-700 ${isBn ? 'font-bengali' : ''}`}>
        {t.success}
      </p>
    );
  }

  const fieldClass =
    'w-full rounded-2xl border border-sky-200/80 bg-white/95 px-4 py-3 text-slate-900 shadow-[0_16px_34px_-22px_rgba(14,116,144,0.45)] outline-none ring-sky-300/40 transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4';

  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${isBn ? 'font-bengali' : ''}`}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-900">
          {t.emailLabel} <span className="text-red-500">*</span>
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className={fieldClass}
          placeholder={isBn ? 'আপনার ইমেইল' : 'you@example.com'}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-900">{t.nameLabel}</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          className={fieldClass}
        />
      </label>
      <CountrySelect
        label={countryLabel}
        value={country}
        onChange={setCountry}
        locale={lang}
        disabled={status === 'loading'}
      />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-900">
          {t.messageLabel} <span className="text-red-500">*</span>
        </span>
        <textarea
          name="message"
          required
          minLength={3}
          rows={4}
          value={message}
          onChange={(ev) => setMessage(ev.target.value)}
          className={`${fieldClass} min-h-[120px] resize-y`}
        />
      </label>

      {!alreadyOnNewsletterList ? (
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-sky-100/90 bg-white/70 px-3 py-3 sm:px-4">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
            checked={newsletterOptIn}
            onChange={(ev) => setNewsletterOptIn(ev.target.checked)}
          />
          <span className={`text-sm leading-relaxed text-slate-700 ${isBn ? 'font-bengali' : ''}`}>
            {t.newsletterOptInLabel}
          </span>
        </label>
      ) : null}

      {status === 'error' ? (
        <p className={`text-sm text-red-600 ${isBn ? 'font-bengali' : ''}`}>{t.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 px-8 py-3.5 text-base font-bold text-white shadow-[0_18px_36px_-18px_rgba(79,70,229,0.75)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:opacity-60"
      >
        {status === 'loading' ? '…' : t.submit}
      </button>
    </form>
  );
}
