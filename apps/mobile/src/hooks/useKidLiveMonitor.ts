/**
 * Parent-side hook for listening to a kid's live activity via Socket.IO.
 * Used in kid-activity.tsx LIVE tab.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { API_BASE_URL } from '../constants/api';

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
    | 'online'
    | 'offline';
  payload: Record<string, any>;
  timestamp: number;
};

export function useKidLiveMonitor(familyId: string | null, kidId: string | null) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isKidOnline, setIsKidOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();

  const addEvent = useCallback((type: LiveEvent['type'], payload: Record<string, any>, timestamp: number) => {
    setEvents((prev) => [
      { id: `${timestamp}-${Math.random()}`, type, payload, timestamp },
      ...prev.slice(0, 199), // keep last 200 events
    ]);
  }, []);

  useEffect(() => {
    if (!familyId || !kidId || !accessToken) return;

    const baseUrl = API_BASE_URL?.replace('/api/v1', '') ?? '';

    const socket = io(`${baseUrl}/monitor`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-kid-room', { familyId, kidId });
    });

    const events: Array<[string, LiveEvent['type']]> = [
      ['kid:online', 'online'],
      ['kid:offline', 'offline'],
      ['kid:section-enter', 'section-enter'],
      ['kid:section-exit', 'section-exit'],
      ['kid:video-play', 'video-play'],
      ['kid:search', 'search'],
      ['kid:url-visit', 'url-visit'],
      ['kid:screenshot', 'screenshot'],
      ['kid:camera-photo', 'camera-photo'],
      ['kid:screen-time-update', 'screen-time-update'],
      ['kid:app-foreground', 'app-foreground'],
    ];

    events.forEach(([serverEvent, type]) => {
      socket.on(serverEvent, (data: any) => {
        if (type === 'online') setIsKidOnline(true);
        if (type === 'offline') setIsKidOnline(false);
        addEvent(type, data, data.timestamp ?? Date.now());
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [familyId, kidId, accessToken, addEvent]);

  function clearEvents() {
    setEvents([]);
  }

  return { events, isKidOnline, clearEvents };
}
