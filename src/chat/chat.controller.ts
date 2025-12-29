import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';

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
    const conversation = await this.chatService.createOrGetConversation(
      user.id,
      body.userId,
      body.listingId,
    );
    return {
      success: true,
      data: conversation,
    };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  async getConversations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUser() user: any,
  ) {
    const conversations = await this.chatService.getConversations(
      user.id,
      parseInt(page),
      parseInt(limit),
    );
    return {
      success: true,
      data: conversations,
    };
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const messages = await this.chatService.getMessages(
      conversationId,
      parseInt(page),
      parseInt(limit),
    );
    return {
      success: true,
      data: messages,
    };
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send message' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser() user: any,
  ) {
    const message = await this.chatService.sendMessage(
      conversationId,
      user.id,
      createMessageDto,
    );
    return {
      success: true,
      data: message,
    };
  }

  @Put('messages/:messageId')
  @ApiOperation({ summary: 'Update message' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @CurrentUser() user: any,
  ) {
    const message = await this.chatService.updateMessage(
      messageId,
      user.id,
      updateMessageDto,
    );
    return {
      success: true,
      data: message,
    };
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete message' })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: any,
  ) {
    await this.chatService.deleteMessage(messageId, user.id);
    return { success: true };
  }

  @Get('conversations/:conversationId/messages/search')
  @ApiOperation({ summary: 'Search messages in conversation' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async searchMessages(
    @Param('conversationId') conversationId: string,
    @Query() searchDto: SearchMessagesDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.chatService.searchMessages(
      conversationId,
      user.id,
      searchDto,
    );
    return {
      success: true,
      data: result.messages,
      pagination: result.pagination,
    };
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


