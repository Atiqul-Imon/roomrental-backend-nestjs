import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        bio: true,
        phone: true,
        preferences: true,
        verification: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: { user },
    };
  }

  async updateProfile(userId: string, updateData: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        bio: true,
        phone: true,
        preferences: true,
        verification: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: { user: updated },
    };
  }

  async getUserProfile(userId: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        profileImage: true,
        bio: true,
        verification: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's listings if landlord
    let listings = [];
    if (user.role === 'landlord') {
      listings = await this.prisma.listing.findMany({
        where: { landlordId: userId, status: 'available' },
        select: {
          id: true,
          title: true,
          price: true,
          city: true,
          state: true,
          images: true,
        },
        take: 5,
      });
    }

    // Get reviews
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: {
        user,
        listings,
        reviews,
      },
    };
  }
}



