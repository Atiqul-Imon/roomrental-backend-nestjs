import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SocketGateway } from '../socket/socket.gateway';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly MAX_MESSAGES_PER_MINUTE = 20; // Rate limiting
  private readonly userMessageCounts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private socketGateway: SocketGateway,
  ) {
    // Clean up rate limit map every minute
    setInterval(() => {
      const now = Date.now();
      for (const [userId, data] of this.userMessageCounts.entries()) {
        if (data.resetAt < now) {
          this.userMessageCounts.delete(userId);
        }
      }
    }, 60000);
  }

  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const userData = this.userMessageCounts.get(userId);

    if (!userData || userData.resetAt < now) {
      this.userMessageCounts.set(userId, { count: 1, resetAt: now + 60000 });
      return;
    }

    if (userData.count >= this.MAX_MESSAGES_PER_MINUTE) {
      throw new BadRequestException('Rate limit exceeded. Please wait before sending more messages.');
    }

    userData.count++;
  }

  async createOrGetConversation(
    userId1: string,
    userId2: string,
    listingId?: string,
  ) {
    // Prevent self-conversation
    if (userId1 === userId2) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    // Check if conversation exists
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          {
            participant1Id: userId1,
            participant2Id: userId2,
            listingId: listingId || null,
          },
          {
            participant1Id: userId2,
            participant2Id: userId1,
            listingId: listingId || null,
          },
        ],
      },
      include: {
        participant1: { 
          select: { id: true, name: true, profileImage: true, email: true } 
        },
        participant2: { 
          select: { id: true, name: true, profileImage: true, email: true } 
        },
        listing: {
          select: { id: true, title: true, images: true, price: true }
        },
        messages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { 
              select: { id: true, name: true, profileImage: true } 
            },
          },
        },
      },
    });

    // Create if doesn't exist
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          participant1Id: userId1,
          participant2Id: userId2,
          listingId: listingId || null,
        },
        include: {
          participant1: { 
            select: { id: true, name: true, profileImage: true, email: true } 
          },
          participant2: { 
            select: { id: true, name: true, profileImage: true, email: true } 
          },
          listing: listingId ? {
            select: { id: true, title: true, images: true, price: true }
          } : false,
          messages: {
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: { 
                select: { id: true, name: true, profileImage: true } 
              },
            },
          },
        },
      });
    }

    return conversation;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    createMessageDto: CreateMessageDto,
  ) {
    // Rate limiting
    this.checkRateLimit(senderId);

    // Validate content
    if (!createMessageDto.content.trim() && (!createMessageDto.attachments || createMessageDto.attachments.length === 0)) {
      throw new BadRequestException('Message content or attachments are required');
    }

    // Verify conversation exists and user is participant
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: senderId },
          { participant2Id: senderId },
        ],
      },
      include: {
        participant1: { select: { id: true } },
        participant2: { select: { id: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    try {
      // Create message
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          senderId,
          content: createMessageDto.content.trim(),
          messageType: (createMessageDto.messageType || 'text') as any,
          attachments: createMessageDto.attachments || [],
          deliveredAt: new Date(),
        },
        include: {
          sender: { 
            select: { id: true, name: true, profileImage: true } 
          },
          conversation: {
            include: {
              participant1: { select: { id: true } },
              participant2: { select: { id: true } },
            },
          },
        },
      });

      // Update conversation last message time
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      // Emit via Socket.io
      const recipientId =
        message.conversation.participant1Id === senderId
          ? message.conversation.participant2Id
          : message.conversation.participant1Id;

      // Emit to conversation room (both online and offline users will receive when they connect)
      this.socketGateway.server
        .to(`conversation:${conversationId}`)
        .emit('new-message', message);

      // Emit to user's personal room for notifications
      this.socketGateway.server
        .to(`user:${recipientId}`)
        .emit('new-message-notification', {
          conversationId,
          message,
        });

      // Invalidate unread count cache for the recipient (async, don't wait)
      this.cache.del(`chat-unread-count:${recipientId}`).catch(() => {
        // Ignore cache errors
      });

      // Check if recipient is online for immediate delivery status
      if (this.socketGateway.isUserOnline(recipientId)) {
        // Mark as delivered immediately if user is online
        await this.prisma.message.update({
          where: { id: message.id },
          data: { deliveredAt: new Date() },
        });
      }

      this.logger.log(`Message ${message.id} sent by ${senderId} in conversation ${conversationId}`);
      return message;
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send message. Please try again.');
    }
  }

  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      include: {
        participant1: { 
          select: { id: true, name: true, profileImage: true } 
        },
        participant2: { 
          select: { id: true, name: true, profileImage: true } 
        },
        listing: { 
          select: { id: true, title: true, images: true } 
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    });

    // Get all unread counts in a single query (fixes N+1 query problem)
    const conversationIds = conversations.map((conv) => conv.id);
    const unreadCounts = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
      _count: {
        id: true,
      },
    });

    // Create a map of conversationId -> unreadCount
    const unreadCountMap = new Map(
      unreadCounts.map((item) => [item.conversationId, item._count.id])
    );

    // Map conversations to include unreadCount
    const conversationsWithUnread = conversations.map((conv) => ({
      ...conv,
      unreadCount: unreadCountMap.get(conv.id) || 0,
    }));

    return conversationsWithUnread;
  }

  async getMessages(conversationId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { 
          select: { id: true, name: true, profileImage: true } 
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return messages.reverse(); // Return in chronological order
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
    
    // Invalidate unread count cache
    await this.cache.del(`chat-unread-count:${userId}`);
  }

  async getUnreadCount(userId: string) {
    // Cache unread count for 30 seconds (matches frontend refetch interval)
    const cacheKey = `chat-unread-count:${userId}`;
    
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const count = await this.prisma.message.count({
          where: {
            conversation: {
              OR: [{ participant1Id: userId }, { participant2Id: userId }],
            },
            senderId: { not: userId },
            readAt: null,
          },
        });
        return count;
      },
      30, // 30 seconds cache
    );
  }

  async updateMessage(
    messageId: string,
    userId: string,
    updateMessageDto: UpdateMessageDto,
  ) {
    // Find message and verify ownership
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          select: {
            participant1Id: true,
            participant2Id: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is the sender
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Check if message is too old (e.g., 15 minutes)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const MAX_EDIT_AGE = 15 * 60 * 1000; // 15 minutes
    if (messageAge > MAX_EDIT_AGE) {
      throw new BadRequestException('Message is too old to edit');
    }

    try {
      const updatedMessage = await this.prisma.message.update({
        where: { id: messageId },
        data: {
          content: updateMessageDto.content.trim(),
        },
        include: {
          sender: {
            select: { id: true, name: true, profileImage: true },
          },
        },
      });

      // Emit update event
      this.socketGateway.server
        .to(`conversation:${message.conversationId}`)
        .emit('message-updated', updatedMessage);

      this.logger.log(`Message ${messageId} updated by ${userId}`);
      return updatedMessage;
    } catch (error) {
      this.logger.error(`Error updating message: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update message');
    }
  }

  async deleteMessage(messageId: string, userId: string) {
    // Find message and verify ownership
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          select: {
            participant1Id: true,
            participant2Id: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is the sender
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    try {
      await this.prisma.message.delete({
        where: { id: messageId },
      });

      // Emit delete event
      this.socketGateway.server
        .to(`conversation:${message.conversationId}`)
        .emit('message-deleted', { messageId, conversationId: message.conversationId });

      this.logger.log(`Message ${messageId} deleted by ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete message');
    }
  }

  async searchMessages(
    conversationId: string,
    userId: string,
    searchDto: SearchMessagesDto,
  ) {
    // Verify user is participant
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    const skip = ((searchDto.page || 1) - 1) * (searchDto.limit || 20);
    const take = searchDto.limit || 20;

    const where: any = {
      conversationId,
    };

    // Add search query if provided
    if (searchDto.query && searchDto.query.trim()) {
      where.content = {
        contains: searchDto.query.trim(),
        mode: 'insensitive',
      };
    }

    try {
      const [messages, total] = await Promise.all([
        this.prisma.message.findMany({
          where,
          include: {
            sender: {
              select: { id: true, name: true, profileImage: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.message.count({ where }),
      ]);

      return {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          total,
          page: searchDto.page || 1,
          limit: searchDto.limit || 20,
          totalPages: Math.ceil(total / (searchDto.limit || 20)),
        },
      };
    } catch (error) {
      this.logger.error(`Error searching messages: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to search messages');
    }
  }
}

