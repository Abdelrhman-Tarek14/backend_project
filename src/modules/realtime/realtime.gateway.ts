import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers['authorization'];
      if (!token) throw new Error('No token provided');

      // Verify token
      const secret = this.configService.get<string>('jwt.secret') || 'super-secret-key-change-in-prod';
      const payload = this.jwtService.verify(token.replace('Bearer ', ''), { secret });
      
      // Store user info in socket
      client.data.user = payload;
      console.log(`Client connected: ${client.id} (User ID: ${payload.sub})`);
    } catch (err: any) {
      console.log(`Connection failed for client ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): string {
    return 'pong';
  }
}
