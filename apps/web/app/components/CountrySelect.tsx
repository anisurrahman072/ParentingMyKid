'use client';

import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  buildCountryOptions,
  countryCodeToFlagEmoji,
  filterCountryOptions,
  type CountryOption,
} from '@/lib/countries';

type Props = {
  value: string;
  onChange: (iso2: string) => void;
  locale: 'bn' | 'en';
  label: string;
  disabled?: boolean;
};

type PanelPos = { top: number; left: number; width: number };

export function CountrySelect({ value, onChange, locale, label, disabled }: Props): ReactElement {
  const autoId = useId();
  const labelId = `${autoId}-label`;
  const listboxId = `${autoId}-listbox`;
  const searchId = `${autoId}-search`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const [domReady, setDomReady] = useState(false);

  useEffect(() => setDomReady(true), []);

  const allOptions = useMemo(() => buildCountryOptions(locale), [locale]);
  const filtered = useMemo(() => filterCountryOptions(allOptions, query), [allOptions, query]);

  const selected = useMemo(
    () => allOptions.find((o) => o.code === value) ?? allOptions.find((o) => o.code === 'BD'),
    [allOptions, value],
  );

  const updatePanelPosition = useMemo(
    () => (): void => {
      const btn = triggerRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const gap = 8;
      setPanelPos({
        top: r.bottom + gap,
        left: r.left,
        width: r.width,
      });
    },
    [],
  );

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPosition();
    const onScrollOrResize = (): void => {
      window.requestAnimationFrame(updatePanelPosition);
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function pick(option: CountryOption): void {
    onChange(option.code);
    setOpen(false);
    setQuery('');
  }

  const triggerClass =
    'flex w-full min-h-[52px] items-center gap-3 rounded-2xl border border-sky-200/80 bg-white px-4 py-3 text-left text-slate-900 shadow-[0_16px_34px_-22px_rgba(14,116,144,0.45)] outline-none ring-sky-300/40 transition focus:border-sky-400 focus:ring-4 disabled:opacity-60';

  const dropdownPanel =
    open && panelPos ? (
      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        className="fixed z-[500] overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)]"
        style={{
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
        }}
      >
        <div className="border-b border-slate-200 bg-white p-2">
          <label htmlFor={searchId} className="sr-only">
            {locale === 'bn' ? 'দেশ খুঁজুন' : 'Search countries'}
          </label>
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === 'bn' ? 'দেশের নাম খুঁজুন…' : 'Search country…'}
            className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <ul
          className="max-h-[min(18rem,calc(100vh-8rem))] overflow-y-auto overscroll-contain bg-white py-1"
          role="presentation"
          aria-label={locale === 'bn' ? 'দেশের তালিকা' : 'Countries'}
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              {locale === 'bn' ? 'কোনো ফলাফল নেই' : 'No matches'}
            </li>
          ) : (
            filtered.map((opt) => (
              <li key={opt.code} role="option" aria-selected={opt.code === value}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left text-sm text-slate-800 transition hover:bg-sky-50"
                  onClick={() => pick(opt)}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {countryCodeToFlagEmoji(opt.code)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{opt.name}</span>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {opt.code}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div className="relative w-full">
      <div ref={anchorRef}>
        <span id={labelId} className="mb-1.5 block text-sm font-semibold text-slate-900">
          {label}
        </span>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label={`${label}: ${selected?.name ?? ''}`}
          className={triggerClass}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              const btn = triggerRef.current;
              if (btn) {
                const r = btn.getBoundingClientRect();
                setPanelPos({ top: r.bottom + 8, left: r.left, width: r.width });
              }
              setOpen(true);
            } else {
              setQuery('');
              setOpen(false);
            }
          }}
        >
          <span className="text-2xl leading-none" aria-hidden>
            {countryCodeToFlagEmoji(selected?.code ?? 'BD')}
          </span>
          <span className="min-w-0 flex-1 truncate text-base font-medium">{selected?.name ?? '—'}</span>
          <span className="shrink-0 text-slate-500" aria-hidden>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>
      </div>

      {domReady && dropdownPanel && typeof document !== 'undefined'
        ? createPortal(dropdownPanel, document.body)
        : null}
    </div>
  );
}
