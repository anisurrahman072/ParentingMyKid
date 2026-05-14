/**
 * Parent-side hook for monitoring a kid's live activity via Socket.IO pub-sub.
 *
 * Architecture: NO POLLING.
 *   Parent connects to the dedicated Socket.IO server (pmk-socket on Render),
 *   joins a room family:{familyId}:kid:{kidId}, and receives events pushed in
 *   real-time by the kid's device as they happen.
 *
 * Room: family:{familyId}:kid:{kidId}
 * Events received: kid:online, kid:offline, kid:section-enter, kid:section-exit,
 *   kid:video-play, kid:search, kid:url-visit, kid:screenshot, kid:camera-photo,
 *   kid:screen-time-update, kid:app-foreground, kid:usage-sync
 *
 * Connection lifecycle:
 *   - Socket connects when familyId + kidId + accessToken are available.
 *   - Socket disconnects on component unmount or when params become null.
 *   - Auto-reconnects on network restore (socket.io built-in).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { SOCKET_BASE_URL } from '../constants/api';

export type LiveEvent = {
  id: string;
  type:
    | 'section-enter'
    | 'section-exit'
    | 'video-play'
    | 'search'
    | 'url-visit'
    | 'screenshot'
    | 'camera-photo'
    | 'screen-time-update'
    | 'app-foreground'
    | 'usage-sync'
    | 'online'
    | 'offline';
  payload: Record<string, unknown>;
  timestamp: number;
};

const KID_EVENTS: Array<{ socketEvent: string; type: LiveEvent['type'] }> = [
  { socketEvent: 'kid:online', type: 'online' },
  { socketEvent: 'kid:offline', type: 'offline' },
  { socketEvent: 'kid:section-enter', type: 'section-enter' },
  { socketEvent: 'kid:section-exit', type: 'section-exit' },
  { socketEvent: 'kid:video-play', type: 'video-play' },
  { socketEvent: 'kid:search', type: 'search' },
  { socketEvent: 'kid:url-visit', type: 'url-visit' },
  { socketEvent: 'kid:screenshot', type: 'screenshot' },
  { socketEvent: 'kid:camera-photo', type: 'camera-photo' },
  { socketEvent: 'kid:screen-time-update', type: 'screen-time-update' },
  { socketEvent: 'kid:app-foreground', type: 'app-foreground' },
  { socketEvent: 'kid:usage-sync', type: 'usage-sync' },
];

const MAX_EVENTS = 200;
let eventCounter = 0;

export function useKidLiveMonitor(familyId: string | null, kidId: string | null) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isKidOnline, setIsKidOnline] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();

  const addEvent = useCallback((type: LiveEvent['type'], payload: Record<string, unknown>) => {
    const event: LiveEvent = {
      id: `evt-${++eventCounter}-${Date.now()}`,
      type,
      payload,
      timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    };
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));

    if (type === 'online') setIsKidOnline(true);
    if (type === 'offline') setIsKidOnline(false);
  }, []);

  useEffect(() => {
    if (!familyId || !kidId || !accessToken) return;

    // Reset state when params change
    setEvents([]);
    setIsKidOnline(false);

    const socket = io(`${SOCKET_BASE_URL}/monitor`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join the family-kid room as soon as connected
      socket.emit('join-kid-room', { familyId, kidId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setIsKidOnline(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[useKidLiveMonitor] connect error:', err.message);
    });

    // Register all kid activity event listeners
    for (const { socketEvent, type } of KID_EVENTS) {
      socket.on(socketEvent, (data: Record<string, unknown>) => {
        addEvent(type, data);
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [familyId, kidId, accessToken, addEvent]);

  /** Send a control command from parent to kid device via the room */
  const sendParentCommand = useCallback(
    (command: 'parent:policy-update' | 'parent:stop-session' | 'parent:send-message', data?: Record<string, unknown>) => {
      socketRef.current?.emit(command, { ...(data ?? {}), familyId, kidId });
    },
    [familyId, kidId],
  );

  function clearEvents() {
    setEvents([]);
  }

  return { events, isKidOnline, isConnected, clearEvents, sendParentCommand };
}
