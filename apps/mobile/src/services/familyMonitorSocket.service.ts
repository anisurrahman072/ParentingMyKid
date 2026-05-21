/**
 * Family-wide Socket.IO monitor — parent device.
 *
 * Connects once when the parent authenticates and joins a room for every kid in
 * the family: `family:{familyId}:kid:{kidId}`. Maintains an in-memory presence
 * map so any screen can instantly read whether a kid is currently active on
 * their device, without an API round-trip.
 *
 * Lifecycle:
 *   connectFamilyMonitor(familyId, kidIds, accessToken) — call from parent layout
 *   disconnectFamilyMonitor()                           — call on logout / unmount
 *
 * Reactive subscription:
 *   subscribePresence(listener) → returns unsubscribe fn
 *
 * Point-in-time read:
 *   getKidPresence(kidId) → KidPresence
 */

import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../constants/api';

export type KidPresence = {
  isOnline: boolean;
  /** ISO string of the last time we got a socket signal, null if never seen this session */
  lastSeenAt: string | null;
};

type PresenceListener = (kidId: string, presence: KidPresence) => void;

let socket: Socket | null = null;
let connectedFamilyId: string | null = null;
/** Kids whose room has been joined on this socket connection */
const joinedKidIds = new Set<string>();
const presenceMap = new Map<string, KidPresence>();
const listeners = new Set<PresenceListener>();

function notifyListeners(kidId: string, presence: KidPresence): void {
  presenceMap.set(kidId, presence);
  for (const fn of listeners) {
    fn(kidId, presence);
  }
}

function joinRoomsOnSocket(familyId: string, kidIds: string[]): void {
  if (!socket) return;
  for (const kidId of kidIds) {
    if (!joinedKidIds.has(kidId)) {
      socket.emit('join-kid-room', { familyId, kidId });
      joinedKidIds.add(kidId);
    }
  }
}

/**
 * Connect the parent to /monitor and join all kid rooms.
 * Idempotent — calling again for the same family just joins any new kid rooms.
 */
export function connectFamilyMonitor(
  familyId: string,
  kidIds: string[],
  accessToken: string,
): void {
  if (!familyId || !accessToken || kidIds.length === 0) return;

  // Same family and socket still alive → just join any rooms added since last call
  if (socket?.connected && connectedFamilyId === familyId) {
    joinRoomsOnSocket(familyId, kidIds);
    return;
  }

  // Different family or dead socket → clean slate
  if (socket) {
    socket.disconnect();
    socket = null;
    joinedKidIds.clear();
  }

  connectedFamilyId = familyId;

  socket = io(`${SOCKET_BASE_URL}/monitor`, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  });

  socket.on('connect', () => {
    // Re-join all rooms after every connect / reconnect
    joinedKidIds.clear();
    joinRoomsOnSocket(familyId, kidIds);
  });

  socket.on('connect_error', (err) => {
    console.warn('[familyMonitorSocket] connect error:', err.message);
  });

  socket.on('kid:online', (data: { kidId?: string; timestamp?: number }) => {
    if (!data.kidId) return;
    notifyListeners(data.kidId, {
      isOnline: true,
      lastSeenAt: new Date(data.timestamp ?? Date.now()).toISOString(),
    });
  });

  socket.on('kid:offline', (data: { kidId?: string; timestamp?: number }) => {
    if (!data.kidId) return;
    notifyListeners(data.kidId, {
      isOnline: false,
      lastSeenAt: new Date(data.timestamp ?? Date.now()).toISOString(),
    });
  });

  // Any activity event confirms the kid is still alive even without explicit kid:online
  const ACTIVITY_EVENTS = [
    'kid:section-enter',
    'kid:app-foreground',
    'kid:screen-time-update',
    'kid:usage-sync',
    'kid:video-play',
    'kid:search',
    'kid:url-visit',
  ] as const;

  for (const event of ACTIVITY_EVENTS) {
    socket.on(event, (data: { kidId?: string; timestamp?: number }) => {
      const kidId = data.kidId;
      if (!kidId) return;
      const existing = presenceMap.get(kidId);
      // Avoid noisy re-notifications when the kid is already marked online
      if (existing?.isOnline) return;
      notifyListeners(kidId, {
        isOnline: true,
        lastSeenAt: new Date(data.timestamp ?? Date.now()).toISOString(),
      });
    });
  }
}

/**
 * Join a kid room after the initial connection (e.g. new kid added to family).
 */
export function joinKidRoomIfNeeded(kidId: string): void {
  if (!socket?.connected || !connectedFamilyId) return;
  if (joinedKidIds.has(kidId)) return;
  socket.emit('join-kid-room', { familyId: connectedFamilyId, kidId });
  joinedKidIds.add(kidId);
}

/** Disconnect and clear all state. Call on logout. */
export function disconnectFamilyMonitor(): void {
  socket?.disconnect();
  socket = null;
  connectedFamilyId = null;
  joinedKidIds.clear();
  presenceMap.clear();
}

/** Snapshot (non-reactive) presence for a kid. */
export function getKidPresence(kidId: string): KidPresence {
  return presenceMap.get(kidId) ?? { isOnline: false, lastSeenAt: null };
}

/**
 * Subscribe to presence updates for any kid in the family.
 * Returns an unsubscribe function — call it in a useEffect cleanup.
 */
export function subscribePresence(listener: PresenceListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isFamilyMonitorConnected(): boolean {
  return socket?.connected === true;
}
