import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get conversation' })
  async createOrGetConversation(
    @Body() body: { userId: string; listingId?: string },
    @CurrentUser() user: any,
  ) {
    return this.chatService.createOrGetConversation(
      user.id,
      body.userId,
      body.listingId,
    );
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  async getConversations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: any,
  ) {
    return this.chatService.getConversations(
      user.id,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.chatService.getMessages(
      conversationId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send message' })
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string; messageType?: string; attachments?: string[] },
    @CurrentUser() user: any,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      user.id,
      body.content,
      body.messageType,
      body.attachments,
    );
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: any,
  ) {
    await this.chatService.markAsRead(conversationId, user.id);
    return { success: true };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.chatService.getUnreadCount(user.id);
    return { count };
  }
}


