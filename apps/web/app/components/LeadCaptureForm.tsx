'use client';

import { useEffect, useRef, useState } from 'react';

import { CountrySelect } from './CountrySelect';

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
  const [country, setCountry] = useState(() =>
    variant === 'full' ? (lang === 'bn' ? 'BD' : 'US') : '',
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>(
    'idle',
  );
  const modalAutoCloseRef = useRef<number | null>(null);
  /** Prevents double-submit (double-click / fast Enter) from firing two POSTs — second could get 409. */
  const submitLockRef = useRef(false);

  const t = content.leadCapture;
  const isBn = lang === 'bn';

  useEffect(() => {
    if (variant !== 'full') return;
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
  }, [lang, variant]);

  /** Keep the result message visible long enough to read; optional early dismiss via button. */
  const MODAL_RESULT_MS = 10_000;

  const dismissModalAfterResult = (): void => {
    if (modalAutoCloseRef.current) {
      window.clearTimeout(modalAutoCloseRef.current);
      modalAutoCloseRef.current = null;
    }
    onSubscribed?.();
  };

  useEffect(() => {
    if (variant !== 'modal' || !onSubscribed) return;
    if (status !== 'success' && status !== 'duplicate') return;
    modalAutoCloseRef.current = window.setTimeout(() => {
      modalAutoCloseRef.current = null;
      onSubscribed();
    }, MODAL_RESULT_MS);
    return () => {
      if (modalAutoCloseRef.current) {
        window.clearTimeout(modalAutoCloseRef.current);
        modalAutoCloseRef.current = null;
      }
    };
  }, [status, variant, onSubscribed]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!base) {
      setStatus('error');
      return;
    }
    if (submitLockRef.current) return;
    submitLockRef.current = true;
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
        markNewsletterSubscribed(email.trim());
        setStatus('success');
        setName('');
        setEmail('');
        setCountry(variant === 'full' ? (lang === 'bn' ? 'BD' : 'US') : '');
        return;
      }
      if (res.status === 409) {
        markNewsletterSubscribed(email.trim());
        setStatus('duplicate');
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    } finally {
      submitLockRef.current = false;
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
    if (variant === 'modal' && onSubscribed) {
      return (
        <div className="space-y-4">
          <p className={`text-sm font-medium text-emerald-700 ${isBn ? 'font-bengali' : ''}`}>
            {t.success}
          </p>
          <button
            type="button"
            onClick={dismissModalAfterResult}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-sky-500/50 bg-white/90 px-6 py-2.5 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-white"
          >
            {t.closeLabel}
          </button>
        </div>
      );
    }
    return (
      <p className={`text-sm font-medium text-emerald-700 ${isBn ? 'font-bengali' : ''}`}>
        {t.success}
      </p>
    );
  }

  if (variant === 'modal' && status === 'duplicate') {
    return (
      <div className="space-y-4">
        <p className={`text-sm font-medium text-amber-800 ${isBn ? 'font-bengali' : ''}`}>
          {t.duplicate}
        </p>
        {onSubscribed ? (
          <button
            type="button"
            onClick={dismissModalAfterResult}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-sky-500/50 bg-white/90 px-6 py-2.5 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-white"
          >
            {t.closeLabel}
          </button>
        ) : null}
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className={`mb-1.5 block text-sm font-semibold text-slate-900 ${isBn ? 'font-bengali' : ''}`}>
            {t.emailLabel} <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="w-full rounded-2xl border border-sky-200/80 bg-white/95 px-4 py-3 text-slate-900 shadow-[0_16px_34px_-22px_rgba(14,116,144,0.55)] outline-none ring-sky-300/40 transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4"
            placeholder={isBn ? 'আপনার ইমেইল লিখুন' : 'Enter your email'}
          />
        </label>
        {status === 'error' ? (
          <p className={`text-sm text-red-600 ${isBn ? 'font-bengali' : ''}`}>{t.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-[0_18px_36px_-18px_rgba(79,70,229,0.8)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:opacity-60"
        >
          {status === 'loading' ? '…' : t.submit}
        </button>
      </form>
    );
  }

  const fieldClass =
    'w-full rounded-2xl border border-sky-200/80 bg-white/95 px-4 py-3 text-slate-900 shadow-[0_16px_34px_-22px_rgba(14,116,144,0.45)] outline-none ring-sky-300/40 transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4';

  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${isBn ? 'font-bengali' : ''}`}>
      <div className="grid gap-4">
        <label className="block w-full">
          <span className={`mb-1.5 block text-sm font-semibold text-slate-900`}>{t.nameLabel}</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block w-full">
          <span className={`mb-1.5 block text-sm font-semibold text-slate-900`}>
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
        <CountrySelect
          label={t.countryLabel}
          value={country}
          onChange={setCountry}
          locale={lang}
          disabled={status === 'loading'}
        />
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
        className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 px-8 py-3.5 text-base font-bold text-white shadow-[0_18px_36px_-18px_rgba(79,70,229,0.75)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:opacity-60"
      >
        {status === 'loading' ? '…' : t.submit}
      </button>
    </form>
  );
}
