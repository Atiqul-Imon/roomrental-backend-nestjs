import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
  ) {}

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
    content: string,
    messageType: string = 'text',
    attachments: string[] = [],
  ) {
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

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        messageType: messageType as any,
        attachments,
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

    // Check if recipient is online
    if (this.socketGateway.isUserOnline(recipientId)) {
      // Emit to conversation room
      this.socketGateway.server
        .to(`conversation:${conversationId}`)
        .emit('new-message', message);
    } else {
      // Queue for offline delivery (can be enhanced later)
      this.logger.log(`User ${recipientId} is offline, message saved for later delivery`);
    }

    return message;
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

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        });

        return {
          ...conv,
          unreadCount,
        };
      })
    );

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
  }

  async getUnreadCount(userId: string) {
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
}

