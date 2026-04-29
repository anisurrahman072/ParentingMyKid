/**
 * @module monitor.gateway.ts
 * @description Real-time WebSocket gateway for live child monitoring.
 *              Parents subscribe to a family:kidId room and receive live events
 *              from the child's device (section enter/exit, videos, searches, screenshots).
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/monitor',
  cors: { origin: '*', credentials: true },
})
export class MonitorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as { sub: string; role: string };
      client.data.userId = payload.sub;
      client.data.role = payload.role;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const kidRoom = client.data.kidRoom as string | undefined;
    if (kidRoom) {
      this.server.to(kidRoom).emit('kid:offline', { timestamp: Date.now() });
    }
  }

  @SubscribeMessage('join-kid-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { familyId: string; kidId: string },
  ) {
    const room = `family:${data.familyId}:kid:${data.kidId}`;
    void client.join(room);
    client.data.kidRoom = room;
    if (client.data.role === 'CHILD' || data.kidId) {
      this.server.to(room).emit('kid:online', { kidId: data.kidId, timestamp: Date.now() });
    }
  }

  @SubscribeMessage('kid:section-enter')
  handleSectionEnter(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:section-enter', { ...(data as object), timestamp: Date.now() });
  }

  @SubscribeMessage('kid:section-exit')
  handleSectionExit(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:section-exit', { ...(data as object), timestamp: Date.now() });
  }

  @SubscribeMessage('kid:video-play')
  handleVideoPlay(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:video-play', { ...(data as object), timestamp: Date.now() });
  }

  @SubscribeMessage('kid:search')
  handleSearch(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:search', { ...(data as object), timestamp: Date.now() });
  }

  @SubscribeMessage('kid:url-visit')
  handleUrlVisit(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:url-visit', { ...(data as object), timestamp: Date.now() });
  }

  @SubscribeMessage('kid:screenshot')
  handleScreenshot(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:screenshot', { ...(data as object), timestamp: Date.now() });
  }

  @SubscribeMessage('kid:camera-photo')
  handleCameraPhoto(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:camera-photo', { ...(data as object), timestamp: Date.now() });
  }

  @SubscribeMessage('kid:screen-time-update')
  handleScreenTimeUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:screen-time-update', { ...(data as object), timestamp: Date.now() });
  }

  @SubscribeMessage('kid:app-foreground')
  handleAppForeground(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const room = client.data.kidRoom as string | undefined;
    if (room) this.server.to(room).emit('kid:app-foreground', { ...(data as object), timestamp: Date.now() });
  }
}
