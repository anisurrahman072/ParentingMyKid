'use client';

import { useState } from 'react';

import { getMarketingApiBaseUrl } from '@/lib/marketing-api';

import type { LandingContent } from '@/lib/content';

type Props = {
  content: Pick<LandingContent, 'feedback' | 'locale'>;
};

export function VisitorFeedbackForm({ content }: Props): React.ReactElement {
  const base = getMarketingApiBaseUrl();
  const lang = content.locale;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const t = content.feedback;
  const isBn = lang === 'bn';

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
          language: lang,
          source: `feedback_${lang}`,
          message: message.trim(),
        }),
      });
      if (res.status === 201) {
        setStatus('success');
        setName('');
        setEmail('');
        setMessage('');
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
          className="w-full rounded-xl border border-white/20 bg-white/80 px-3 py-2.5 text-text-main shadow-sm outline-none ring-brand-mint/30 focus:ring-2"
        />
      </label>
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
          className="w-full rounded-xl border border-white/20 bg-white/80 px-3 py-2.5 text-text-main shadow-sm outline-none ring-brand-mint/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className={`mb-1 block text-sm font-medium text-text-main ${isBn ? 'font-bengali' : ''}`}>
          {t.messageLabel} <span className="text-red-500">*</span>
        </span>
        <textarea
          name="message"
          required
          minLength={3}
          rows={4}
          value={message}
          onChange={(ev) => setMessage(ev.target.value)}
          className="w-full resize-y rounded-xl border border-white/20 bg-white/80 px-3 py-2.5 text-text-main shadow-sm outline-none ring-brand-mint/30 focus:ring-2"
        />
      </label>
      {status === 'error' ? (
        <p className={`text-sm text-red-600 ${isBn ? 'font-bengali' : ''}`}>{t.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-brand-mint bg-white/90 px-8 py-3 text-sm font-bold text-brand-mint shadow-sm transition hover:bg-brand-mint/10 disabled:opacity-60"
      >
        {status === 'loading' ? '…' : t.submit}
      </button>
    </form>
  );
}
