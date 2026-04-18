'use client';

import { useEffect, useState } from 'react';

import { getMarketingApiBaseUrl } from '@/lib/marketing-api';
import { markNewsletterSubscribed } from '@/lib/newsletter-state';

import type { LandingContent } from '@/lib/content';

type Props = {
  content: Pick<LandingContent, 'leadCapture' | 'locale'>;
  /** `modal` = email-only for the scroll dialog; `full` = bottom-of-page form */
  variant?: 'full' | 'modal';
  /** Called after a successful subscribe or when the server says the email is already on the list */
  onSubscribed?: () => void;
};

export function LeadCaptureForm({
  content,
  variant = 'full',
  onSubscribed,
}: Props): React.ReactElement {
  const base = getMarketingApiBaseUrl();
  const lang = content.locale;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>(
    'idle',
  );

  const t = content.leadCapture;
  const isBn = lang === 'bn';

  useEffect(() => {
    if (variant !== 'modal' || !onSubscribed) return;
    if (status !== 'success' && status !== 'duplicate') return;
    const ms = status === 'success' ? 850 : 1200;
    const id = window.setTimeout(() => onSubscribed(), ms);
    return () => window.clearTimeout(id);
  }, [status, variant, onSubscribed]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!base) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(`${base}/api/v1/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          country: country.trim() || undefined,
          language: lang,
          source: `landing_${lang}`,
        }),
      });
      if (res.status === 201) {
        markNewsletterSubscribed();
        setStatus('success');
        setName('');
        setEmail('');
        setCountry('');
        return;
      }
      if (res.status === 409) {
        markNewsletterSubscribed();
        setStatus('duplicate');
        return;
      }
      setStatus('error');
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

  if (variant === 'modal' && status === 'duplicate') {
    return (
      <p className={`text-sm font-medium text-amber-800 ${isBn ? 'font-bengali' : ''}`}>
        {t.duplicate}
      </p>
    );
  }

  if (variant === 'modal') {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className={`mb-1 block text-sm font-medium text-text-main ${isBn ? 'font-bengali' : ''}`}>
            {t.emailLabel} <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-text-main shadow-sm outline-none ring-brand-mint/30 placeholder:text-text-soft focus:ring-2"
          />
        </label>
        {status === 'error' ? (
          <p className={`text-sm text-red-600 ${isBn ? 'font-bengali' : ''}`}>{t.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-brand-mint px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
        >
          {status === 'loading' ? '…' : t.submit}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={`mb-1 block text-sm font-medium text-text-main ${isBn ? 'font-bengali' : ''}`}>
            {t.nameLabel}
          </span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/80 px-3 py-2.5 text-text-main shadow-sm outline-none ring-brand-mint/30 placeholder:text-text-soft focus:ring-2"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={`mb-1 block text-sm font-medium text-text-main ${isBn ? 'font-bengali' : ''}`}>
            {t.emailLabel} <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/80 px-3 py-2.5 text-text-main shadow-sm outline-none ring-brand-mint/30 placeholder:text-text-soft focus:ring-2"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={`mb-1 block text-sm font-medium text-text-main ${isBn ? 'font-bengali' : ''}`}>
            {t.countryLabel}
          </span>
          <input
            type="text"
            name="country"
            autoComplete="country"
            placeholder={t.countryHint}
            value={country}
            onChange={(ev) => setCountry(ev.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/80 px-3 py-2.5 text-text-main shadow-sm outline-none ring-brand-mint/30 placeholder:text-text-soft focus:ring-2"
          />
        </label>
      </div>
      {status === 'duplicate' ? (
        <p className={`text-sm text-amber-800 ${isBn ? 'font-bengali' : ''}`}>{t.duplicate}</p>
      ) : null}
      {status === 'error' ? (
        <p className={`text-sm text-red-600 ${isBn ? 'font-bengali' : ''}`}>{t.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-mint px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
      >
        {status === 'loading' ? '…' : t.submit}
      </button>
    </form>
  );
}
