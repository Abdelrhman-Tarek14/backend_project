import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';
import { Inject, forwardRef, Logger } from '@nestjs/common';

@WebSocketGateway({ cors: false })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private activeUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) { }

  afterInit(server: Server) {
    const origin = this.configService.getOrThrow<string>('frontendUrl');
    server.engine.opts.cors = { origin, credentials: true };
    this.logger.log(`WebSocket CORS restricted to: ${origin}`);
  }

  async handleConnection(client: Socket) {
    try {
      const rawCookie = client.handshake.headers.cookie;
      if (!rawCookie) throw new Error('No cookies found');

      const accessToken = this.extractCookie(rawCookie, 'access_token');
      if (!accessToken) throw new Error('Access token missing');

      const secret = this.configService.get<string>('jwt.accessSecret');
      const payload = this.jwtService.verify(accessToken, { secret });
      const userId = payload.sub;

      const existingSocketId = this.activeUsers.get(userId);
      if (existingSocketId && existingSocketId !== client.id) {
        this.server.to(existingSocketId).emit('force_logout', {
          message: 'Session paused because you connected from another window.'
        });
        setTimeout(() => {
          const oldSocket = this.server.sockets.sockets.get(existingSocketId);
          if (oldSocket) oldSocket.disconnect();
        }, 100);

        await this.usersService.logUserActivity(userId, 'SESSION_OVERRIDDEN');
      }

      this.activeUsers.set(userId, client.id);
      client.data.userId = userId;
      client.data.userRole = payload.role;

      await client.join(`user:${userId}`);

      const managementRoles: Role[] = [Role.SUPER_USER, Role.ADMIN, Role.SUPERVISOR, Role.CMD, Role.LEADER, Role.SUPPORT];
      if (managementRoles.includes(payload.role)) {
        await client.join('management_dashboard');
      }

      await this.usersService.setOnlineStatus(userId, true);
      await this.usersService.logUserActivity(userId, 'CONNECTED');

      this.server.to('management_dashboard').emit('user_status_changed', { userId, isOnline: true });

      this.logger.log(`User ${userId} connected as ${payload.role}`);

    } catch (err: any) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Realtime connection rejected for socket ${client.id}. Reason: ${reason}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.activeUsers.get(userId) === client.id) {
      this.activeUsers.delete(userId);
      await this.usersService.setOnlineStatus(userId, false);
      await this.usersService.logUserActivity(userId, 'DISCONNECTED');

      this.server.to('management_dashboard').emit('user_status_changed', { userId, isOnline: false });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    if (!client.data.userId) return;
    return { event: 'pong', timestamp: new Date().toISOString() };
  }

  private extractCookie(cookieString: string, key: string): string | undefined {
    const cookies = cookieString.split(';').reduce((acc: any, cookie) => {
      const parts = cookie.trim().split('=');
      const name = parts.shift();
      const value = parts.join('=');
      if (name) acc[name] = value;
      return acc;
    }, {});
    return cookies[key];
  }
}