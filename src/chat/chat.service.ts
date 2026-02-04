import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SocketGateway } from '../socket/socket.gateway';
import { EmailService } from '../email/email.service';
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
    private emailService: EmailService,
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

      // Emit via Socket.io - CRITICAL: Ensure both sender and recipient get instant delivery
      const recipientId =
        message.conversation.participant1Id === senderId
          ? message.conversation.participant2Id
          : message.conversation.participant1Id;

      // Emit to conversation room (all participants in the conversation)
      // This ensures both sender and recipient receive the message instantly
      this.socketGateway.server
        .to(`conversation:${conversationId}`)
        .emit('new-message', message);

      // Also emit to sender's personal room for immediate confirmation
      // This ensures the sender sees their own message instantly even if not in conversation room
      this.socketGateway.server
        .to(`user:${senderId}`)
        .emit('new-message', message);

      // Emit to recipient's personal room for notifications (if not in conversation room)
      this.socketGateway.server
        .to(`user:${recipientId}`)
        .emit('new-message-notification', {
          conversationId,
          message,
        });

      // No cache to invalidate - unread count is always fresh

      // Check if recipient is online for immediate delivery status
      const isRecipientOnline = this.socketGateway.isUserOnline(recipientId);
      if (isRecipientOnline) {
        // Mark as delivered immediately if user is online
        await this.prisma.message.update({
          where: { id: message.id },
          data: { deliveredAt: new Date() },
        });
      }

      // Check if this is the first message in the conversation
      // Only send email notification for the first message to avoid spam
      const messageCount = await this.prisma.message.count({
        where: { conversationId },
      });

      // Send email notification ONLY for the first message:
      // - ALWAYS send to landlords (regardless of online status) - makes it super easy for students to connect
      // - Send to other users only if offline
      // This is async and non-blocking - don't wait for it
      if (messageCount === 1) {
        this.sendEmailNotificationIfEnabled(
          recipientId,
          senderId,
          message.content,
          conversationId,
          conversation.listingId || undefined,
          isRecipientOnline, // Pass online status to check if we should send
        ).catch((error) => {
          // Log error but don't fail message creation
          this.logger.error(`Failed to send email notification: ${error.message}`, error.stack);
        });
      } else {
        this.logger.debug(`Skipping email notification - not the first message (message count: ${messageCount})`);
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
    
    // No cache to invalidate - unread count is always fresh
  }

  async getUnreadCount(userId: string) {
    // NO CACHING - Always fetch fresh for real-time accuracy
    // Cache was causing stale data and delays in message delivery
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

  /**
   * Send email notification if user has email notifications enabled
   * ALWAYS sends to landlords (regardless of online status) to make it super easy for students
   * Only sends to other users if they're offline
   * This is called asynchronously and doesn't block message creation
   */
  private async sendEmailNotificationIfEnabled(
    recipientId: string,
    senderId: string,
    messageContent: string,
    conversationId: string,
    listingId: string | undefined,
    isRecipientOnline: boolean,
  ): Promise<void> {
    try {
      // Get recipient user with preferences and role
      const recipient = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          preferences: true,
        },
      });

      if (!recipient || !recipient.email) {
        this.logger.warn(`Recipient ${recipientId} not found or has no email`);
        return;
      }

      // CRITICAL: Always send email to landlords (regardless of online status)
      // This makes it super easy for students to connect with landlords
      const isLandlord = recipient.role === 'landlord';
      
      // For non-landlords, only send if offline
      if (!isLandlord && isRecipientOnline) {
        this.logger.debug(`Recipient ${recipientId} is online and not a landlord - skipping email`);
        return;
      }

      // Check if email notifications are enabled (default to true if not set)
      // For landlords, we still respect preferences but log if disabled
      const preferences = recipient.preferences as any;
      const emailNotificationsEnabled = preferences?.emailNotifications !== false;

      if (!emailNotificationsEnabled) {
        if (isLandlord) {
          this.logger.warn(`Landlord ${recipientId} has email notifications disabled - consider enabling for better student communication`);
        } else {
          this.logger.debug(`Email notifications disabled for user ${recipientId}`);
        }
        return;
      }

      // Get sender information
      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!sender) {
        this.logger.warn(`Sender ${senderId} not found`);
        return;
      }

      // Get listing information if available
      let listingTitle: string | undefined;
      if (listingId) {
        const listing = await this.prisma.listing.findUnique({
          where: { id: listingId },
          select: { title: true },
        });
        listingTitle = listing?.title;
      }

      // Prepare message preview (first 150 characters)
      const messagePreview = messageContent.length > 150
        ? `${messageContent.substring(0, 150)}...`
        : messageContent;

      // Get frontend URL for unsubscribe link
      const frontendUrl = process.env.FRONTEND_URL || 'https://www.roomrentalusa.com';
      const unsubscribeLink = `${frontendUrl}/settings`;

      // Send email notification
      const emailSent = await this.emailService.sendMessageNotification({
        to: recipient.email,
        recipientName: recipient.name || 'User',
        senderName: sender.name || 'User',
        messagePreview,
        conversationId,
        listingTitle,
        unsubscribeLink,
        recipientRole: recipient.role,
      });

      if (emailSent) {
        this.logger.log(`Email notification sent to ${recipient.email} for conversation ${conversationId}`);
      } else {
        this.logger.warn(`Failed to send email notification to ${recipient.email}`);
      }
    } catch (error) {
      // Don't throw - this is a background operation
      this.logger.error(`Error in sendEmailNotificationIfEnabled: ${error.message}`, error.stack);
    }
  }
}

