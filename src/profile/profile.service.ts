import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getProfile(userId: string) {
    const cacheKey = `profile:${userId}`;

    // Try to get from cache (10 minutes TTL)
    return this.cache.getOrSet(
      cacheKey,
      async () => {
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
      },
      600, // 10 minutes cache
    );
  }

  async updateProfile(userId: string, updateData: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Security: Prevent users from elevating their role to admin/staff
    // Only allow role changes between 'student' and 'landlord' (regular roles)
    if (updateData.role) {
      const allowedRoles = ['student', 'landlord'];
      const currentRole = user.role;
      
      // If trying to set admin/staff role, reject (only admins can do this via admin panel)
      if (!allowedRoles.includes(updateData.role)) {
        throw new ForbiddenException('Cannot change role to ' + updateData.role + '. Only student and landlord roles are allowed.');
      }
      
      // If current role is admin/staff, prevent downgrade via profile update
      if (!allowedRoles.includes(currentRole)) {
        throw new ForbiddenException('Cannot change role from ' + currentRole + '. Please contact administrator.');
      }
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

    // Invalidate cache
    await Promise.all([
      this.cache.del(`profile:${userId}`),
      this.cache.del(`user:${userId}`),
      this.cache.invalidatePattern(`user-profile:${userId}*`),
    ]);

    return {
      success: true,
      data: { user: updated },
    };
  }

  async getUserProfile(userId: string, currentUserId: string) {
    const cacheKey = `user-profile:${userId}`;

    // Try to get from cache (10 minutes TTL)
    return this.cache.getOrSet(
      cacheKey,
      async () => {
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
        let listings: Array<{
          id: string;
          title: string;
          price: number;
          city: string;
          state: string;
          images: string[];
        }> = [];
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
      },
      600, // 10 minutes cache
    );
  }

  /**
   * Get full profile data including ratings and stats in one call
   * This reduces API calls from 3 to 1 for profile pages
   */
  async getFullProfileData(userId: string, currentUserId: string) {
    const cacheKey = `full-profile:${userId}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Fetch all data in parallel
        const [user, reviews, listings] = await Promise.all([
          // Get user profile
          this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: userId === currentUserId, // Only include email if viewing own profile
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
          }),
          // Get reviews for rating calculation
          this.prisma.review.findMany({
            where: { revieweeId: userId },
            select: { rating: true },
          }),
          // Get listings for stats (if landlord)
          this.prisma.listing.findMany({
            where: { landlordId: userId },
            select: {
              id: true,
              status: true,
              price: true,
              viewCount: true,
            },
          }),
        ]);

        if (!user) {
          throw new NotFoundException('User not found');
        }

        // Calculate rating stats
        const totalReviews = reviews.length;
        const averageRating =
          totalReviews > 0
            ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
            : 0;

        // Calculate user stats based on role
        let stats: any = {};
        if (user.role === 'landlord') {
          stats = {
            listings: listings.length,
            activeListings: listings.filter((l) => l.status === 'available').length,
            totalViews: listings.reduce((sum, l) => sum + (l.viewCount || 0), 0),
            revenue: listings
              .filter((l) => l.status === 'rented')
              .reduce((sum, l) => sum + (l.price || 0), 0),
          };
        }

        return {
          success: true,
          data: {
            user,
            rating: {
              averageRating,
              totalReviews,
            },
            stats,
          },
        };
      },
      600, // 10 minutes cache
    );
  }
}



