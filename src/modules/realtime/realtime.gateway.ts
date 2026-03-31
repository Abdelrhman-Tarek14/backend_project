import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: true, // Allow frontend origin
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // In-memory session tracking: userId -> socketId
  private activeUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // 1. Manual Cookie Extraction (fixes HttpOnly visibility issue)
      const rawCookie = client.handshake.headers.cookie;
      if (!rawCookie) throw new Error('No cookies found');

      const accessToken = this.extractCookie(rawCookie, 'access_token');
      if (!accessToken) throw new Error('Access token missing in cookies');

      // 2. Verify JWT
      const secret = this.configService.get<string>('jwt.accessSecret') || 'access-secret';
      const payload = this.jwtService.verify(accessToken, { secret });
      const userId = payload.sub;

      // 3. Single Session Enforcement
      const existingSocketId = this.activeUsers.get(userId);
      if (existingSocketId && existingSocketId !== client.id) {
        console.log(`User ${userId} logged in from new session. Disconnecting old socket ${existingSocketId}`);
        this.server.to(existingSocketId).emit('force_logout', { message: 'Multiple sessions detected.' });
        const oldSocket = this.server.sockets.sockets.get(existingSocketId);
        if (oldSocket) oldSocket.disconnect();
        
        await this.usersService.logUserActivity(userId, 'SESSION_OVERRIDDEN');
      }

      // 4. Update Map & State
      this.activeUsers.set(userId, client.id);
      client.data.userId = userId;
      client.data.userRole = payload.role;

      // 5. Room Management
      await client.join(`user:${userId}`);
      
      const managementRoles: string[] = [Role.ADMIN, Role.SUPER_USER, Role.SUPERVISOR, Role.CMD, Role.LEADER, Role.SUPPORT];
      if (managementRoles.includes(payload.role)) {
        await client.join('management_dashboard');
      }

      await this.usersService.setOnlineStatus(userId, true);
      await this.usersService.logUserActivity(userId, 'CONNECTED');

      console.log(`REALTIME: User ${userId} connected as ${payload.role} via socket ${client.id}`);
      this.server.emit('user_status_changed', { userId, isOnline: true });

    } catch (err: any) {
      console.log(`REALTIME: Connection failed for socket ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.activeUsers.get(userId) === client.id) {
      this.activeUsers.delete(userId);
      await this.usersService.setOnlineStatus(userId, false);
      await this.usersService.logUserActivity(userId, 'DISCONNECTED');
      this.server.emit('user_status_changed', { userId, isOnline: false });
      console.log(`REALTIME: User ${userId} fully disconnected.`);
    }
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong', timestamp: new Date().toISOString() };
  }

  private extractCookie(cookieString: string, key: string): string | undefined {
    const cookies = cookieString.split(';').reduce((acc: any, cookie) => {
      const [name, value] = cookie.trim().split('=');
      acc[name] = value;
      return acc;
    }, {});
    return cookies[key];
  }
}
