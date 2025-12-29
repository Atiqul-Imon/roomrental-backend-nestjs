import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : [process.env.FRONTEND_URL || 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async afterInit(server: Server) {
    try {
      // Setup Redis Adapter for scaling
      const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
      const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

      const pubClient = createClient({
        url: `redis://${redisHost}:${redisPort}`,
        password: redisPassword,
      });
      
      const subClient = pubClient.duplicate();
      
      await Promise.all([pubClient.connect(), subClient.connect()]);
      
      server.adapter(createAdapter(pubClient, subClient));
      this.logger.log('✅ Redis adapter configured for Socket.io');
    } catch (error) {
      this.logger.error(`Failed to setup Redis adapter: ${error.message}`);
      this.logger.warn('Socket.io will work in single-server mode');
    }
  }

  async handleConnection(client: Socket) {
    try {
      // Authenticate WebSocket connection
      const token = client.handshake.auth.token || 
                   client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Store user ID with socket ID
      client.data.userId = payload.sub;
      this.connectedUsers.set(payload.sub, client.id);
      
      // Join user's personal room for direct messages
      client.join(`user:${payload.sub}`);
      
      // Broadcast user online status
      client.broadcast.emit('user-online', { userId: payload.sub });
      
      this.logger.log(`User ${payload.sub} connected (socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      client.broadcast.emit('user-offline', { userId });
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join-conversation')
  handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conversation:${data.conversationId}`;
    client.join(room);
    this.logger.log(`User ${client.data.userId} joined conversation ${data.conversationId}`);
  }

  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conversation:${data.conversationId}`;
    client.leave(room);
  }

  @SubscribeMessage('typing-start')
  handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conversation:${data.conversationId}`;
    client.to(room).emit('user-typing', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `conversation:${data.conversationId}`;
    client.to(room).emit('user-stopped-typing', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('mark-message-read')
  handleMarkMessageRead(
    @MessageBody() data: { messageId: string; conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Emit read receipt to sender
    const room = `conversation:${data.conversationId}`;
    client.to(room).emit('message-read', {
      messageId: data.messageId,
      readBy: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  // Helper methods
  getSocketIdForUser(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Emit message update to conversation room
  emitMessageUpdate(conversationId: string, message: any) {
    this.server.to(`conversation:${conversationId}`).emit('message-updated', message);
  }

  // Emit message deletion to conversation room
  emitMessageDelete(conversationId: string, messageId: string) {
    this.server.to(`conversation:${conversationId}`).emit('message-deleted', {
      messageId,
      conversationId,
    });
  }
}







