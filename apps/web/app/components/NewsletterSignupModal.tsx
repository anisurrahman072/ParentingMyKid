'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { LeadCaptureForm } from './LeadCaptureForm';

import type { LandingContent } from '@/lib/content';
import {
  clearExpiredSnooze,
  getModalTimesShown,
  isInSnoozePeriod,
  isNewsletterModalSuppressedClient,
  isQuietThisVisit,
  markNewsletterAlreadySubscribedAcknowledged,
  MAX_MODAL_SHOWS_PER_SESSION,
  MODAL_SCROLL_FIRST,
  recordModalOpened,
  setQuietThisVisit,
  startSnooze,
} from '@/lib/newsletter-state';

type Props = {
  content: LandingContent;
};

type ModalPhase = 'form' | 'goodbye';

function scrollDepth(): number {
  const el = document.documentElement;
  const sh = el.scrollHeight - window.innerHeight;
  if (sh <= 0) return 1;
  return Math.min(1, window.scrollY / sh);
}

/**
 * Scroll-triggered dialog: first open ~10% depth, then up to 3 more times per tab session,
 * each after a 90s snooze from the previous close (covers “~72% scroll” intent + users who stay near the top).
 * Persistent localStorage suppresses repeats if the user subscribed or chose “Already subscribed”.
 */
export function NewsletterSignupModal({ content }: Props): React.ReactElement | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>('form');
  const [hydrated, setHydrated] = useState(false);
  const [canCenter, setCanCenter] = useState(true);
  const openRef = useRef(false);
  const isBn = content.locale === 'bn';
  const t = content.leadCapture;

  useEffect(() => {
    setHydrated(true);
  }, []);

  /** Keep ref aligned with React state so tryOpen is not blocked after close. */
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const tryOpen = useCallback(() => {
    if (!hydrated) return;
    clearExpiredSnooze();
    if (isNewsletterModalSuppressedClient()) return;
    if (isQuietThisVisit()) return;
    if (openRef.current) return;
    if (isInSnoozePeriod()) return;

    const depth = scrollDepth();
    const times = getModalTimesShown();

    if (times >= MAX_MODAL_SHOWS_PER_SESSION) return;

    if (times === 0 && depth >= MODAL_SCROLL_FIRST) {
      openRef.current = true;
      setPhase('form');
      setOpen(true);
      recordModalOpened();
      return;
    }

    /**
     * Shows 2–4: only after the user closed the previous modal (snooze = 90s).
     * That matches “again at ~72% scroll” for readers who move down during the wait, and
     * “after ~90s” for visitors who stay near the top (snooze end ≈ same wall-clock moment).
     */
    if (times >= 1 && times < MAX_MODAL_SHOWS_PER_SESSION) {
      openRef.current = true;
      setPhase('form');
      setOpen(true);
      recordModalOpened();
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    let raf = 0;
    const tick = (): void => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        tryOpen();
      });
    };

    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
    const interval = window.setInterval(tick, 700);
    const onVis = (): void => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    const onPageShow = (): void => tick();
    window.addEventListener('pageshow', onPageShow);
    tick();

    return () => {
      window.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onPageShow);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [hydrated, tryOpen]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      if (!el.open) el.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      if (el.open) el.close();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const closeDialog = useCallback(() => {
    openRef.current = false;
    setOpen(false);
    setPhase('form');
  }, []);

  /** Snooze — same for ×, ESC, backdrop, “Remind me later”. */
  const handleSnooze = useCallback(() => {
    if (phase === 'goodbye') {
      closeDialog();
      return;
    }
    startSnooze();
    openRef.current = false;
    setOpen(false);
    setPhase('form');
  }, [closeDialog, phase]);

  const handleAlreadySubscribed = useCallback(() => {
    markNewsletterAlreadySubscribedAcknowledged();
    openRef.current = false;
    setOpen(false);
    setPhase('form');
  }, []);

  const handleQuiet = useCallback(() => {
    setQuietThisVisit();
    setPhase('goodbye');
  }, []);

  const finishQuiet = useCallback(() => {
    closeDialog();
  }, [closeDialog]);

  useEffect(() => {
    if (phase !== 'goodbye' || !open) return;
    const id = window.setTimeout(finishQuiet, 3200);
    return () => window.clearTimeout(id);
  }, [phase, open, finishQuiet]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onCancel = (e: Event): void => {
      e.preventDefault();
      handleSnooze();
    };
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [handleSnooze]);

  useEffect(() => {
    if (!open) return;
    setCanCenter(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const viewport = viewportRef.current;
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    if (!viewport || !wrapper || !card) return;

    const updateFit = (): void => {
      const styles = window.getComputedStyle(wrapper);
      const padTop = Number.parseFloat(styles.paddingTop) || 0;
      const padBottom = Number.parseFloat(styles.paddingBottom) || 0;
      const availableHeight = wrapper.clientHeight - padTop - padBottom;
      const modalHeight = card.getBoundingClientRect().height;
      const fits = modalHeight <= availableHeight + 1;
      setCanCenter(fits);
      if (fits) viewport.scrollTop = 0;
    };

    const rafA = window.requestAnimationFrame(() => {
      updateFit();
      window.requestAnimationFrame(updateFit);
    });
    const resizeObserver = new ResizeObserver(updateFit);
    resizeObserver.observe(wrapper);
    resizeObserver.observe(card);
    window.addEventListener('resize', updateFit, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafA);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateFit);
    };
  }, [open, phase]);

  if (!hydrated) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[100] m-0 h-dvh w-dvw max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-slate-950/60 backdrop:backdrop-blur-[3px]"
      aria-labelledby="newsletter-modal-title"
      aria-describedby="newsletter-modal-desc"
    >
      <div
        ref={viewportRef}
        className="h-dvh w-dvw overflow-x-hidden overflow-y-auto overscroll-contain"
        onClick={(e) => {
          const card = cardRef.current;
          if (card && !card.contains(e.target as Node)) handleSnooze();
        }}
      >
        <div
          ref={wrapperRef}
          className={`mx-auto flex min-h-dvh w-full max-w-2xl justify-center px-2 py-2 sm:px-4 sm:py-4 ${canCenter ? 'items-center' : 'items-start'}`}
        >
          <div
            ref={cardRef}
            className="relative w-full overflow-hidden rounded-[2rem] border border-white/35 bg-gradient-to-br from-[#eef6ff] via-[#f4f0ff] to-[#e8fff7] p-5 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.58)] ring-1 ring-white/70 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-300/45 via-indigo-300/40 to-fuchsia-300/45 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/35 via-sky-300/30 to-blue-300/35 blur-3xl"
          />
          {phase === 'form' ? (
            <div className="relative z-10">
            <button
              type="button"
              onClick={handleSnooze}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-sky-500/55 bg-white/85 text-2xl leading-none text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-sky-900"
              aria-label={t.closeLabel}
            >
              ×
            </button>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-700">ParentingMyKid</p>
            <h2
              id="newsletter-modal-title"
              className={`mt-2 max-w-[92%] text-2xl font-black text-slate-900 sm:text-4xl ${isBn ? 'font-bengali leading-[1.25]' : ''}`}
            >
              {t.modalTitle}
            </h2>
            <p
              id="newsletter-modal-desc"
              className={`mt-3 text-sm leading-relaxed text-slate-700 sm:text-base ${isBn ? 'font-bengali leading-[1.9]' : ''}`}
            >
              {t.modalSubtitle}
            </p>
            <div
              className={`mt-5 rounded-2xl border border-white/70 bg-white/70 p-4 text-slate-800 shadow-[0_16px_44px_-28px_rgba(30,64,175,0.45)] sm:p-5 ${isBn ? 'font-bengali' : ''}`}
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
            <div className="mt-5">
              <LeadCaptureForm
                content={content}
                variant="modal"
                onSubscribed={closeDialog}
              />
            </div>
            <div
              className={`mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-slate-200/85 pt-4 ${isBn ? 'font-bengali' : ''}`}
            >
              <button
                type="button"
                onClick={handleSnooze}
                className="min-h-[42px] rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-slate-900"
              >
                {t.remindLater}
              </button>
              <button
                type="button"
                onClick={handleQuiet}
                className="min-h-[42px] rounded-full px-4 py-2 text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
              >
                {t.notForNow}
              </button>
              <button
                type="button"
                onClick={handleAlreadySubscribed}
                className="min-h-[42px] rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                {t.alreadySubscribed}
              </button>
            </div>
            </div>
          ) : (
            <div className="relative z-10 pt-2 text-center">
              <p className="text-4xl" aria-hidden>
                💛
              </p>
              <h2
                id="newsletter-modal-title"
                className={`mt-3 text-2xl font-black text-slate-900 ${isBn ? 'font-bengali' : ''}`}
              >
                {t.quietGoodbyeTitle}
              </h2>
              <p
                id="newsletter-modal-desc"
                className={`mt-3 text-base leading-relaxed text-slate-700 ${isBn ? 'font-bengali' : ''}`}
              >
                {t.quietGoodbyeBody}
              </p>
              <button
                type="button"
                onClick={finishQuiet}
                className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              >
                {t.quietGoodbyeCta}
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
