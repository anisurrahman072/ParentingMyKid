/**
 * Kid-side activity emitter — Socket.IO pub-sub, NO HTTP polling.
 *
 * Architecture:
 *   Kid device → Socket.IO emit → pmk-socket server → broadcasts to parent room
 *
 * The kid device connects once and keeps a persistent Socket.IO connection.
 * All activity events (section enter/exit, app foreground, usage sync, etc.)
 * are emitted as socket events — zero HTTP round-trips, zero polling.
 *
 * Connection lifecycle:
 *   connectKidMonitor()    — authenticate + join family-kid room
 *   disconnectKidMonitor() — clean disconnect, emit kid:offline first
 *
 * All emits are fire-and-forget (best-effort). If the socket is temporarily
 * disconnected, socket.io buffers events and replays on reconnect automatically.
 */

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { SOCKET_BASE_URL } from '../constants/api';

let socket: Socket | null = null;
let currentFamilyId: string | null = null;
let currentKidId: string | null = null;

// Callback hooks — set by the app layer to handle parent commands
let onPolicyUpdate: ((data: Record<string, unknown>) => void) | null = null;
let onStopSession: (() => void) | null = null;

/** Register handler for parent:policy-update command */
export function onParentPolicyUpdate(cb: (data: Record<string, unknown>) => void): void {
  onPolicyUpdate = cb;
}

/** Register handler for parent:stop-session command */
export function onParentStopSession(cb: () => void): void {
  onStopSession = cb;
}

// ─── Session management ───────────────────────────────────────────────────────

export function connectKidMonitor(familyId: string, kidId: string): void {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;

  // Reuse existing connection if already connected to the same room
  if (socket?.connected && currentFamilyId === familyId && currentKidId === kidId) return;

  // Disconnect previous socket if params changed
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentFamilyId = familyId;
  currentKidId = kidId;

  socket = io(`${SOCKET_BASE_URL}/monitor`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  });

  socket.on('connect', () => {
    // Join the family-kid room so parents can see this kid's events
    socket!.emit('join-kid-room', { familyId, kidId });
  });

  socket.on('connect_error', (err) => {
    console.warn('[kidSocketEmitter] connect error:', err.message);
  });

  // Listen for parent control commands and delegate to registered callbacks
  socket.on('parent:policy-update', (data: Record<string, unknown>) => {
    onPolicyUpdate?.(data);
  });

  socket.on('parent:stop-session', () => {
    onStopSession?.();
  });
}

export function disconnectKidMonitor(): void {
  if (socket?.connected && currentFamilyId && currentKidId) {
    socket.emit('kid:offline', { familyId: currentFamilyId, kidId: currentKidId });
  }
  socket?.disconnect();
  socket = null;
  currentFamilyId = null;
  currentKidId = null;
}

export function isKidMonitorConnected(): boolean {
  return socket?.connected === true && currentFamilyId !== null;
}

// ─── Event emitters ───────────────────────────────────────────────────────────

function emit(event: string, data: Record<string, unknown>): void {
  socket?.emit(event, data);
}

export function emitSectionEnter(section: string, kidId: string): void {
  emit('kid:section-enter', { section, kidId, ts: Date.now() });
}

export function emitSectionExit(section: string, kidId: string, durationMs: number): void {
  emit('kid:section-exit', { section, kidId, durationMs, ts: Date.now() });
}

export function emitVideoPlay(videoId: string, title: string, kidId: string): void {
  emit('kid:video-play', { videoId, title, kidId, ts: Date.now() });
}

export function emitSearch(query: string, kidId: string): void {
  emit('kid:search', { query, kidId, ts: Date.now() });
}

export function emitUrlVisit(url: string, domain: string, kidId: string): void {
  emit('kid:url-visit', { url, domain, kidId, ts: Date.now() });
}

export function emitScreenshot(cloudinaryUrl: string, kidId: string): void {
  emit('kid:screenshot', { cloudinaryUrl, kidId, ts: Date.now() });
}

export function emitCameraPhoto(cloudinaryUrl: string, kidId: string): void {
  emit('kid:camera-photo', { cloudinaryUrl, kidId, ts: Date.now() });
}

export function emitScreenTimeUpdate(
  section: string,
  minutesUsed: number,
  dailyLimitMinutes: number,
  kidId: string,
): void {
  emit('kid:screen-time-update', { section, minutesUsed, dailyLimitMinutes, kidId, ts: Date.now() });
}

export function emitAppForeground(packageName: string, appName: string, kidId: string): void {
  emit('kid:app-foreground', { packageName, appName, kidId, ts: Date.now() });
}

/**
 * Bulk usage sync — replaces the old heartbeat POST.
 * Send a snapshot of the kid's screen sessions for the current period.
 */
export function emitUsageSync(sessions: Array<{ packageName: string; appName: string; durationMs: number }>, kidId: string): void {
  emit('kid:usage-sync', { sessions, kidId, ts: Date.now() });
}

// ─── Legacy aliases (keep existing call-sites working) ────────────────────────
/** @deprecated Use connectKidMonitor() */
export const connectKidSocket = connectKidMonitor;
/** @deprecated Use disconnectKidMonitor() */
export const disconnectKidSocket = disconnectKidMonitor;
/** @deprecated Use isKidMonitorConnected() */
export const isSocketConnected = isKidMonitorConnected;
