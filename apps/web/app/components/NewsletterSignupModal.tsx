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
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<ModalPhase>('form');
  const [hydrated, setHydrated] = useState(false);
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

  if (!hydrated) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[100] max-h-none max-w-none overflow-visible bg-transparent p-4 backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
      aria-labelledby="newsletter-modal-title"
      aria-describedby="newsletter-modal-desc"
      onClick={(e) => {
        if (e.target === dialogRef.current) handleSnooze();
      }}
    >
      <div
        className="relative mx-auto mt-[min(8vh,4rem)] w-full max-w-md rounded-3xl border border-white/15 bg-bg-base p-6 shadow-2xl ring-1 ring-white/10 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'form' ? (
          <>
            <button
              type="button"
              onClick={handleSnooze}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-text-soft transition hover:bg-white/10 hover:text-text-main"
              aria-label={t.closeLabel}
            >
              ×
            </button>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-mint">ParentingMyKid</p>
            <h2
              id="newsletter-modal-title"
              className={`mt-2 text-2xl font-black text-text-main sm:text-3xl ${isBn ? 'font-bengali' : ''}`}
            >
              {t.modalTitle}
            </h2>
            <p
              id="newsletter-modal-desc"
              className={`mt-2 text-base leading-relaxed text-text-soft ${isBn ? 'font-bengali' : ''}`}
            >
              {t.modalSubtitle}
            </p>
            <div className="mt-6">
              <LeadCaptureForm
                content={content}
                variant="modal"
                onSubscribed={closeDialog}
              />
            </div>
            <div
              className={`mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3 ${isBn ? 'font-bengali' : ''}`}
            >
              <button
                type="button"
                onClick={handleSnooze}
                className="order-1 min-h-[44px] rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-text-main transition hover:bg-white/10"
              >
                {t.remindLater}
              </button>
              <button
                type="button"
                onClick={handleQuiet}
                className="order-2 min-h-[44px] rounded-full px-5 py-2.5 text-sm font-medium text-text-soft underline decoration-white/30 underline-offset-4 transition hover:text-text-main"
              >
                {t.notForNow}
              </button>
              <button
                type="button"
                onClick={handleAlreadySubscribed}
                className="order-3 min-h-[44px] rounded-full px-5 py-2.5 text-sm font-medium text-text-soft transition hover:text-text-main"
              >
                {t.alreadySubscribed}
              </button>
            </div>
          </>
        ) : (
          <div className="pt-2 text-center">
            <p className="text-4xl" aria-hidden>
              💛
            </p>
            <h2
              id="newsletter-modal-title"
              className={`mt-3 text-2xl font-black text-text-main ${isBn ? 'font-bengali' : ''}`}
            >
              {t.quietGoodbyeTitle}
            </h2>
            <p
              id="newsletter-modal-desc"
              className={`mt-3 text-base leading-relaxed text-text-soft ${isBn ? 'font-bengali' : ''}`}
            >
              {t.quietGoodbyeBody}
            </p>
            <button
              type="button"
              onClick={finishQuiet}
              className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand-mint px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
            >
              {t.quietGoodbyeCta}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
