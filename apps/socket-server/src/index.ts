/**
 * PMK Real-Time Socket.IO Server
 *
 * Architecture: Pure pub-sub with room-based isolation.
 *   - Each parent-kid pair joins a shared room: family:{familyId}:kid:{kidId}
 *   - The kid device emits events into the room; the parent device receives them.
 *   - The parent device emits control commands; the kid device receives them.
 *
 * No database. No polling. No third-party services beyond socket.io itself.
 * JWT is verified on connection using the shared JWT_SECRET from the NestJS API.
 *
 * Deploy to Render as a separate Web Service (free tier).
 * Set env vars: JWT_SECRET, PORT (optional, defaults to 3002), ALLOWED_ORIGINS
 */

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

// ─── Config ────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3002', 10);
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*').split(',').map((o) => o.trim());

if (!JWT_SECRET) {
  console.error('[socket-server] FATAL: JWT_SECRET env var is not set');
  process.exit(1);
}

// ─── JWT Payload ───────────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  role: string;
  familyIds?: string[];
  iat?: number;
  exp?: number;
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Server Setup ──────────────────────────────────────────────────────────

const httpServer = createServer((_req, res) => {
  // Health-check endpoint for Render's uptime monitor
  if (_req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Namespaces ────────────────────────────────────────────────────────────

/**
 * /monitor namespace — parent-kid live monitoring.
 *
 * Room naming: family:{familyId}:kid:{kidId}
 *
 * Emitted by KID device:
 *   kid:online, kid:offline
 *   kid:section-enter, kid:section-exit
 *   kid:video-play
 *   kid:search
 *   kid:url-visit
 *   kid:screenshot
 *   kid:camera-photo
 *   kid:screen-time-update
 *   kid:app-foreground
 *   kid:usage-sync          — bulk screen-time sync (replaces polling)
 *
 * Emitted by PARENT device (control commands):
 *   parent:policy-update    — new policy applied; kid device re-fetches
 *   parent:stop-session     — end kid's current session immediately
 *   parent:send-message     — send a quick message to the kid's screen
 */
const monitor = io.of('/monitor');

monitor.use((socket, next) => {
  const token =
    (socket.handshake.auth as { token?: string })?.token ??
    (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');

  if (!token) return next(new Error('Authentication required'));

  const payload = verifyToken(token);
  if (!payload) return next(new Error('Invalid or expired token'));

  socket.data.userId = payload.sub;
  socket.data.role = payload.role;
  socket.data.familyIds = payload.familyIds ?? [];
  next();
});

monitor.on('connection', (socket: Socket) => {
  const { userId, role } = socket.data as { userId: string; role: string };
  console.log(`[monitor] connected userId=${userId} role=${role} socketId=${socket.id}`);

  // ── Join a family-kid room ───────────────────────────────────────────────
  socket.on('join-kid-room', (data: { familyId: string; kidId: string }) => {
    if (!data?.familyId || !data?.kidId) return;
    const room = `family:${data.familyId}:kid:${data.kidId}`;
    void socket.join(room);
    socket.data.kidRoom = room;
    socket.data.kidId = data.kidId;

    // Announce kid online to everyone in the room — only emit when the KID device joins.
    // Parents join multiple rooms to listen; they must not trigger false kid:online events.
    if (role === 'CHILD') {
      monitor.to(room).emit('kid:online', { kidId: data.kidId, userId, timestamp: Date.now() });
    }
    console.log(`[monitor] ${userId} joined room ${room}`);
  });

  // ── Kid → Room: activity events (parent receives) ───────────────────────
  const kidEvents = [
    'kid:section-enter',
    'kid:section-exit',
    'kid:video-play',
    'kid:search',
    'kid:url-visit',
    'kid:screenshot',
    'kid:camera-photo',
    'kid:screen-time-update',
    'kid:app-foreground',
    'kid:usage-sync',
  ] as const;

  for (const event of kidEvents) {
    socket.on(event, (data: unknown) => {
      const room = socket.data.kidRoom as string | undefined;
      if (!room) return;
      monitor.to(room).emit(event, {
        ...(typeof data === 'object' && data !== null ? data : {}),
        kidId: socket.data.kidId,
        timestamp: Date.now(),
      });
    });
  }

  // ── Parent → Room: control commands (kid device receives) ───────────────
  const parentCommands = [
    'parent:policy-update',
    'parent:stop-session',
    'parent:send-message',
  ] as const;

  for (const cmd of parentCommands) {
    socket.on(cmd, (data: unknown) => {
      const room = socket.data.kidRoom as string | undefined;
      if (!room) return;
      if (role !== 'PARENT') return; // only parents can send control commands
      monitor.to(room).emit(cmd, {
        ...(typeof data === 'object' && data !== null ? data : {}),
        fromParentId: userId,
        timestamp: Date.now(),
      });
    });
  }

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const room = socket.data.kidRoom as string | undefined;
    const kidId = socket.data.kidId as string | undefined;
    console.log(`[monitor] disconnected userId=${userId} reason=${reason}`);
    if (room && role === 'CHILD' && kidId) {
      monitor.to(room).emit('kid:offline', { kidId, timestamp: Date.now() });
    }
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[socket-server] Listening on port ${PORT}`);
  console.log(`[socket-server] /monitor namespace active`);
  console.log(`[socket-server] CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[socket-server] SIGTERM received, closing...');
  httpServer.close(() => process.exit(0));
});
