/**
 * Client-only newsletter UX: subscription, scroll modal tiers, snooze, and “quiet” opt-out per visit.
 */

const LS_SUBSCRIBED = 'pmk.newsletter.subscribed';
/** Email shown in “you’re on the list” card; set on successful subscribe. */
const LS_EMAIL = 'pmk.newsletter.email';
/** ISO timestamp for “member since” line (first time we record in this browser). */
const LS_SUBSCRIBED_AT = 'pmk.newsletter.subscribedAt';
/** User tapped “I’m already subscribed” — suppress modal like a real subscribe. */
const LS_ALREADY_SUBSCRIBED_ACK = 'pmk.newsletter.modal.already_subscribed_ack';
const SS_TIMES_SHOWN = 'pmk.newsletter.modal.timesShown';
const SS_SNOOZE_UNTIL = 'pmk.newsletter.modal.snoozeUntil';
const SS_QUIET_VISIT = 'pmk.newsletter.modal.quietThisVisit';

export const NEWSLETTER_SUBSCRIBED_EVENT = 'pmk-newsletter-subscribed';

/** First prompt after this scroll depth (fraction of page). */
export const MODAL_SCROLL_FIRST = 0.1;

/** Approximate “deep read” scroll depth (e.g. ~72% — product reference; timing is snooze-gated in the modal). */
export const MODAL_SCROLL_SECOND = 0.72;

/** Max times the scroll modal may open per tab session (sessionStorage counter). */
export const MAX_MODAL_SHOWS_PER_SESSION = 4;

/** “Remind me later” / ESC / backdrop — don’t show again until this many ms. */
export const SNOOZE_MS = 90_000;

export function isNewsletterSubscribedClient(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LS_SUBSCRIBED) === '1';
}

/** True if the user subscribed, or said they’re already on the list (persistent). */
export function isNewsletterModalSuppressedClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.localStorage.getItem(LS_SUBSCRIBED) === '1') return true;
  if (window.localStorage.getItem(LS_ALREADY_SUBSCRIBED_ACK) === '1') return true;
  return false;
}

export function markNewsletterAlreadySubscribedAcknowledged(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LS_ALREADY_SUBSCRIBED_ACK, '1');
}

export type NewsletterSubscriptionMeta = {
  email: string | null;
  subscribedAtIso: string | null;
};

/** Email + “member since” for the footer newsletter thank-you card (localStorage). */
export function getNewsletterSubscriptionMeta(): NewsletterSubscriptionMeta {
  if (typeof window === 'undefined') return { email: null, subscribedAtIso: null };
  if (window.localStorage.getItem(LS_SUBSCRIBED) !== '1') {
    return { email: null, subscribedAtIso: null };
  }
  return {
    email: window.localStorage.getItem(LS_EMAIL),
    subscribedAtIso: window.localStorage.getItem(LS_SUBSCRIBED_AT),
  };
}

/**
 * Marks the user as subscribed for modal suppression + footer card.
 * Pass `email` when known so the thank-you card can show it.
 */
export function markNewsletterSubscribed(email?: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LS_SUBSCRIBED, '1');
  const trimmed = email?.trim();
  if (trimmed) {
    window.localStorage.setItem(LS_EMAIL, trimmed);
  }
  if (!window.localStorage.getItem(LS_SUBSCRIBED_AT)) {
    window.localStorage.setItem(LS_SUBSCRIBED_AT, new Date().toISOString());
  }
  window.dispatchEvent(new Event(NEWSLETTER_SUBSCRIBED_EVENT));
}

function readTimesShown(): number {
  if (typeof window === 'undefined') return 0;
  const v = window.sessionStorage.getItem(SS_TIMES_SHOWN);
  return v ? Number.parseInt(v, 10) || 0 : 0;
}

function writeTimesShown(n: number): void {
  window.sessionStorage.setItem(SS_TIMES_SHOWN, String(n));
}

export function recordModalOpened(): void {
  writeTimesShown(readTimesShown() + 1);
}

export function getModalTimesShown(): number {
  return readTimesShown();
}

export function isInSnoozePeriod(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.sessionStorage.getItem(SS_SNOOZE_UNTIL);
  if (!raw) return false;
  const until = Number.parseInt(raw, 10);
  if (Number.isNaN(until)) return false;
  return Date.now() < until;
}

/** Snooze: ESC, backdrop, ×, or “Remind me later”. */
export function startSnooze(ms: number = SNOOZE_MS): void {
  window.sessionStorage.setItem(SS_SNOOZE_UNTIL, String(Date.now() + ms));
}

/** Removes stale snooze timestamps so logic does not depend on leftover keys. */
export function clearExpiredSnooze(): void {
  if (typeof window === 'undefined') return;
  const raw = window.sessionStorage.getItem(SS_SNOOZE_UNTIL);
  if (!raw) return;
  const until = Number.parseInt(raw, 10);
  if (Number.isNaN(until) || Date.now() >= until) {
    window.sessionStorage.removeItem(SS_SNOOZE_UNTIL);
  }
}

export function isQuietThisVisit(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(SS_QUIET_VISIT) === '1';
}

/** “Not for now” — no more modals this browser tab session. */
export function setQuietThisVisit(): void {
  window.sessionStorage.setItem(SS_QUIET_VISIT, '1');
}
