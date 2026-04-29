/**
 * Kid-side Socket.IO emitter service.
 * Emits real-time activity events from the kid's device to the parent
 * via the MonitorGateway on the server.
 */
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';

let socket: Socket | null = null;
let currentRoom: string | null = null;

function getToken(): string | null {
  return useAuthStore.getState().accessToken ?? null;
}

export function connectKidSocket(familyId: string, kidId: string): void {
  const token = getToken();
  if (!token) return;

  const baseUrl = API_BASE_URL?.replace('/api/v1', '') ?? '';

  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(`${baseUrl}/monitor`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    const room = { familyId, kidId };
    socket?.emit('join-kid-room', room);
    currentRoom = `family:${familyId}:kid:${kidId}`;
  });

  socket.on('disconnect', () => {
    currentRoom = null;
  });
}

export function disconnectKidSocket(): void {
  socket?.disconnect();
  socket = null;
  currentRoom = null;
}

export function emitSectionEnter(section: string, kidId: string): void {
  socket?.emit('kid:section-enter', { section, kidId, ts: Date.now() });
}

export function emitSectionExit(section: string, kidId: string, durationMs: number): void {
  socket?.emit('kid:section-exit', { section, kidId, durationMs, ts: Date.now() });
}

export function emitVideoPlay(videoId: string, title: string, kidId: string): void {
  socket?.emit('kid:video-play', { videoId, title, kidId, ts: Date.now() });
}

export function emitSearch(query: string, kidId: string): void {
  socket?.emit('kid:search', { query, kidId, ts: Date.now() });
}

export function emitUrlVisit(url: string, domain: string, kidId: string): void {
  socket?.emit('kid:url-visit', { url, domain, kidId, ts: Date.now() });
}

export function emitScreenshot(cloudinaryUrl: string, kidId: string): void {
  socket?.emit('kid:screenshot', { cloudinaryUrl, kidId, ts: Date.now() });
}

export function emitCameraPhoto(cloudinaryUrl: string, kidId: string): void {
  socket?.emit('kid:camera-photo', { cloudinaryUrl, kidId, ts: Date.now() });
}

export function emitScreenTimeUpdate(
  section: string,
  minutesUsed: number,
  dailyLimitMinutes: number,
  kidId: string,
): void {
  socket?.emit('kid:screen-time-update', {
    section,
    minutesUsed,
    dailyLimitMinutes,
    kidId,
    ts: Date.now(),
  });
}

export function emitAppForeground(packageName: string, appName: string, kidId: string): void {
  socket?.emit('kid:app-foreground', { packageName, appName, kidId, ts: Date.now() });
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
