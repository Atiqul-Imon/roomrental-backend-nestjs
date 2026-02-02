import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SocketModule } from '../socket/socket.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [SocketModule, EmailModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}


