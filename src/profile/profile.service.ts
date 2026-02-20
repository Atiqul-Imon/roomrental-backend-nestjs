import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ProfileService {
  private roleSwitchTracker = new Map<string, { count: number; resetAt: number }>();
  private readonly MAX_ROLE_SWITCHES_PER_DAY = 5; // Rate limit: 5 switches per day

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    // Clean up rate limit map every hour
    setInterval(() => {
      const now = Date.now();
      for (const [userId, data] of this.roleSwitchTracker.entries()) {
        if (data.resetAt < now) {
          this.roleSwitchTracker.delete(userId);
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

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

  /**
   * Switch user role between student and landlord
   * Implements dual-mode account switching similar to Fiverr
   * 
   * @param {string} userId - User ID requesting role switch
   * @param {string} newRole - New role to switch to (student or landlord)
   * @returns {Promise<{success: boolean, data: {user: User, tokens: Tokens, message: string}}>}
   * @throws {NotFoundException} If user not found
   * @throws {ForbiddenException} If trying to switch to/from admin roles
   * @throws {BadRequestException} If rate limit exceeded or invalid role
   */
  async switchRole(userId: string, newRole: 'student' | 'landlord') {
    // Rate limiting check
    this.checkRoleSwitchRateLimit(userId);

    // Get user
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

    // Validate: Only allow switching between student and landlord
    const allowedRoles = ['student', 'landlord'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Admin, staff, and super_admin roles cannot switch to regular user roles. Please contact an administrator.'
      );
    }

    if (!allowedRoles.includes(newRole)) {
      throw new BadRequestException(
        'Can only switch to student or landlord role.'
      );
    }

    // Check if already in the requested role
    if (user.role === newRole) {
      throw new BadRequestException(`You are already in ${newRole} mode.`);
    }

    // Determine if this is first time switching to landlord
    const isFirstTimeLandlord = user.role === 'student' && newRole === 'landlord';

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
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

    // Generate new JWT tokens with updated role
    const tokens = this.authService.generateNewTokens(
      updatedUser.id,
      updatedUser.email,
      updatedUser.role
    );

    // Invalidate all user-related caches
    await Promise.all([
      this.cache.del(`profile:${userId}`),
      this.cache.del(`user:${userId}`),
      this.cache.invalidatePattern(`user-profile:${userId}*`),
      this.cache.invalidatePattern(`full-profile:${userId}*`),
      this.cache.invalidatePattern(`listings:${userId}*`),
    ]);

    // Track this role switch
    this.trackRoleSwitch(userId);

    // Create appropriate success message
    const message = newRole === 'landlord'
      ? isFirstTimeLandlord
        ? 'Welcome to Landlord mode! You can now create and manage listings.'
        : 'Switched to Landlord mode. You can now manage your listings.'
      : 'Switched to Student mode. Browse listings and find your perfect room.';

    return {
      success: true,
      data: {
        user: updatedUser,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        isFirstTimeLandlord,
        message,
      },
    };
  }

  /**
   * Check rate limit for role switching
   * Prevents abuse by limiting switches to 5 per day
   */
  private checkRoleSwitchRateLimit(userId: string): void {
    const now = Date.now();
    const userData = this.roleSwitchTracker.get(userId);
    const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (!userData || userData.resetAt < now) {
      // First switch today or reset period passed
      this.roleSwitchTracker.set(userId, {
        count: 0,
        resetAt: now + oneDayMs,
      });
      return;
    }

    if (userData.count >= this.MAX_ROLE_SWITCHES_PER_DAY) {
      const hoursRemaining = Math.ceil((userData.resetAt - now) / (60 * 60 * 1000));
      throw new BadRequestException(
        `Role switch limit reached. You can switch roles again in ${hoursRemaining} hour(s). This limit prevents abuse and helps maintain account security.`
      );
    }
  }

  /**
   * Track a role switch (increment counter)
   */
  private trackRoleSwitch(userId: string): void {
    const userData = this.roleSwitchTracker.get(userId);
    if (userData) {
      userData.count++;
    }
  }
}



