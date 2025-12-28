import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [users, listings, reviews, favorites] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.review.count(),
      this.prisma.favorite.count(),
    ]);

    const recentListings = await this.prisma.listing.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        landlord: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        stats: {
          users,
          listings,
          reviews,
          favorites,
        },
        recentListings,
      },
    };
  }

  async getAllUsers(query: any) {
    try {
      const { page = 1, limit = 20, role, search } = query;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (role) {
        where.role = role;
      }
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      // Transform users to match frontend expectations
      const transformedUsers = users.map((user) => ({
        id: user.id, // Prisma uses 'id', frontend expects 'id' (not '_id')
        _id: user.id, // Also provide _id for compatibility
        email: user.email,
        name: user.name || '',
        role: user.role,
        profileImage: user.profileImage,
        bio: user.bio,
        phone: user.phone,
        // Transform verification enum to object format expected by frontend
        verification: {
          emailVerified: user.emailVerified,
          phoneVerified: false, // Not tracked in current schema
          idVerified: user.verification === 'verified',
        },
        // Ensure createdAt/updatedAt are strings
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        preferences: user.preferences as any,
      }));

      return {
        success: true,
        data: {
          users: transformedUsers,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  async getAllListings(query: any) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        include: {
          landlord: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      success: true,
      data: {
        listings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getAllLandlords() {
    const landlords = await this.prisma.user.findMany({
      where: { role: 'landlord' },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: landlords };
  }
}








