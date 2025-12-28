import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (role && role !== 'all') {
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
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      // Transform users to match frontend expectations
      const transformedUsers = users.map((user) => {
        try {
          return {
            id: user.id,
            _id: user.id, // Also provide _id for compatibility
            email: user.email || '',
            name: user.name || '',
            role: user.role,
            profileImage: user.profileImage || null,
            bio: user.bio || null,
            phone: user.phone || null,
            // Transform verification enum to object format expected by frontend
            verification: {
              emailVerified: user.emailVerified || false,
              phoneVerified: false, // Not tracked in current schema
              idVerified: user.verification === 'verified',
            },
            // Ensure createdAt/updatedAt are strings
            createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
            preferences: user.preferences || null,
          };
        } catch (transformError) {
          console.error('Error transforming user:', user.id, transformError);
          // Return minimal user data if transformation fails
          return {
            id: user.id,
            _id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role,
            verification: {
              emailVerified: false,
              phoneVerified: false,
              idVerified: false,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      });

      return {
        success: true,
        data: {
          users: transformedUsers,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  async getAllListings(query: any) {
    try {
      const { page = 1, limit = 20, status, search } = query;
      const skip = (Number(page) - 1) * Number(limit);

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
          take: Number(limit),
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

      // Transform listings to match frontend expectations
      const transformedListings = listings.map((listing) => {
        try {
          return {
            _id: listing.id,
            id: listing.id,
            title: listing.title || '',
            description: listing.description || '',
            price: listing.price || 0,
            bedrooms: listing.bedrooms || undefined,
            bathrooms: listing.bathrooms || undefined,
            squareFeet: listing.squareFeet || undefined,
            location: {
              city: listing.city || '',
              state: listing.state || '',
              zip: listing.zip || undefined,
              address: listing.address || undefined,
              coordinates: (listing.latitude && listing.longitude) ? {
                lat: listing.latitude,
                lng: listing.longitude,
              } : undefined,
            },
            images: listing.images || [],
            amenities: listing.amenities || [],
            availabilityDate: listing.availabilityDate ? listing.availabilityDate.toISOString() : new Date().toISOString(),
            status: listing.status,
            createdAt: listing.createdAt ? listing.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: listing.updatedAt ? listing.updatedAt.toISOString() : new Date().toISOString(),
            propertyType: listing.propertyType || undefined,
            petFriendly: listing.petFriendly || false,
            smokingAllowed: listing.smokingAllowed || false,
            genderPreference: listing.genderPreference || undefined,
            parkingAvailable: listing.parkingAvailable || false,
            walkabilityScore: listing.walkabilityScore || undefined,
            nearbyUniversities: listing.nearbyUniversities || [],
            nearbyTransit: listing.nearbyTransit || [],
            viewCount: listing.viewCount || 0,
            // Transform landlord to landlordId format expected by frontend
            landlordId: listing.landlord ? {
              _id: listing.landlord.id,
              name: listing.landlord.name || '',
              email: listing.landlord.email || '',
            } : {
              _id: '',
              name: 'N/A',
              email: 'N/A',
            },
            // Also include landlord for backward compatibility
            landlord: listing.landlord ? {
              id: listing.landlord.id,
              name: listing.landlord.name || '',
              email: listing.landlord.email || '',
            } : undefined,
          };
        } catch (transformError) {
          console.error('Error transforming listing:', listing.id, transformError);
          // Return minimal listing data if transformation fails
          return {
            _id: listing.id,
            id: listing.id,
            title: listing.title || 'Untitled',
            description: listing.description || '',
            price: listing.price || 0,
            location: {
              city: '',
              state: '',
            },
            images: [],
            amenities: [],
            availabilityDate: new Date().toISOString(),
            status: listing.status,
            createdAt: listing.createdAt ? listing.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: listing.updatedAt ? listing.updatedAt.toISOString() : new Date().toISOString(),
            landlordId: {
              _id: '',
              name: 'N/A',
              email: 'N/A',
            },
          };
        }
      });

      return {
        success: true,
        data: {
          listings: transformedListings,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      };
    } catch (error) {
      console.error('Error in getAllListings:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  async getAllLandlords(query: any) {
    try {
      const { page = 1, limit = 20, search, emailVerified } = query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        role: 'landlord',
      };

      // Search filter
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Email verification filter
      if (emailVerified !== undefined) {
        where.emailVerified = emailVerified === 'true' || emailVerified === true;
      }

      const [landlords, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      // Calculate stats for each landlord
      const landlordsWithStats = await Promise.all(
        landlords.map(async (landlord) => {
          // Get all listings for this landlord
          const listings = await this.prisma.listing.findMany({
            where: { landlordId: landlord.id },
            select: {
              id: true,
              price: true,
              status: true,
            },
          });

          const stats = {
            totalListings: listings.length,
            activeListings: listings.filter((l) => l.status === 'available').length,
            pendingListings: listings.filter((l) => l.status === 'pending').length,
            rentedListings: listings.filter((l) => l.status === 'rented').length,
            totalValue: listings.reduce((sum, listing) => sum + listing.price, 0),
            averagePrice: listings.length > 0
              ? listings.reduce((sum, listing) => sum + listing.price, 0) / listings.length
              : 0,
          };

          // Transform landlord to match frontend expectations
          return {
            id: landlord.id,
            _id: landlord.id,
            email: landlord.email || '',
            name: landlord.name || '',
            role: landlord.role,
            profileImage: landlord.profileImage || null,
            bio: landlord.bio || null,
            phone: landlord.phone || null,
            verification: {
              emailVerified: landlord.emailVerified || false,
              phoneVerified: false,
              idVerified: landlord.verification === 'verified',
            },
            createdAt: landlord.createdAt ? landlord.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: landlord.updatedAt ? landlord.updatedAt.toISOString() : new Date().toISOString(),
            preferences: landlord.preferences || null,
            stats,
          };
        })
      );

      return {
        success: true,
        data: {
          landlords: landlordsWithStats,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      };
    } catch (error) {
      console.error('Error in getAllLandlords:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  async getAllAdmins(query: any) {
    try {
      const { page = 1, limit = 20, role, search } = query;
      const skip = (Number(page) - 1) * Number(limit);

      // Filter for admin roles only
      const where: any = {
        role: {
          in: ['admin', 'super_admin', 'staff'],
        },
      };

      // Additional role filter if specified
      if (role && role !== 'all' && ['admin', 'super_admin', 'staff'].includes(role)) {
        where.role = role;
      }

      // Search filter
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
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      // Transform users to match Admin interface expected by frontend
      const transformedAdmins = users.map((user) => {
        try {
          return {
            id: user.id,
            _id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role as 'staff' | 'admin' | 'super_admin',
            profileImage: user.profileImage || null,
            bio: user.bio || null,
            phone: user.phone || null,
            verification: {
              emailVerified: user.emailVerified || false,
              phoneVerified: false,
              idVerified: user.verification === 'verified',
            },
            createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
            preferences: user.preferences || null,
            // Admin metadata (not in database, providing defaults)
            adminMetadata: {
              isActive: true, // Default to active
              permissions: this.getDefaultPermissionsForRole(user.role),
              // createdBy, lastLogin, notes can be added later if needed
            },
          };
        } catch (transformError) {
          console.error('Error transforming admin:', user.id, transformError);
          return {
            id: user.id,
            _id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role as 'staff' | 'admin' | 'super_admin',
            verification: {
              emailVerified: false,
              phoneVerified: false,
              idVerified: false,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            adminMetadata: {
              isActive: true,
              permissions: [],
            },
          };
        }
      });

      return {
        success: true,
        data: {
          admins: transformedAdmins,
          pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      };
    } catch (error) {
      console.error('Error in getAllAdmins:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  private getDefaultPermissionsForRole(role: string): string[] {
    // Default permissions based on role
    const permissions: Record<string, string[]> = {
      super_admin: [
        'view_analytics',
        'view_users',
        'view_listings',
        'view_reviews',
        'view_admins',
        'edit_users',
        'edit_listings',
        'delete_users',
        'delete_listings',
        'system_settings',
        'manage_admins',
      ],
      admin: [
        'view_analytics',
        'view_users',
        'view_listings',
        'view_reviews',
        'edit_users',
        'edit_listings',
        'delete_listings',
      ],
      staff: [
        'view_users',
        'view_listings',
        'view_reviews',
        'edit_listings',
      ],
    };

    return permissions[role] || [];
  }

  async getUserById(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Transform user to match frontend expectations
      const transformedUser = {
        id: user.id,
        _id: user.id,
        email: user.email || '',
        name: user.name || '',
        role: user.role,
        profileImage: user.profileImage || null,
        bio: user.bio || null,
        phone: user.phone || null,
        verification: {
          emailVerified: user.emailVerified || false,
          phoneVerified: false,
          idVerified: user.verification === 'verified',
        },
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
        preferences: user.preferences || null,
      };

      return {
        success: true,
        data: {
          user: transformedUser,
        },
      };
    } catch (error) {
      console.error('Error in getUserById:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  async updateUser(id: string, body: any) {
    try {
      const { name, role, phone, bio } = body;

      // Validate role if provided
      if (role && !['student', 'landlord', 'admin', 'staff', 'super_admin'].includes(role)) {
        throw new BadRequestException('Invalid role');
      }

      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (role !== undefined) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone;
      if (bio !== undefined) updateData.bio = bio;

      // Update user
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      // Transform user to match frontend expectations
      const transformedUser = {
        id: updatedUser.id,
        _id: updatedUser.id,
        email: updatedUser.email || '',
        name: updatedUser.name || '',
        role: updatedUser.role,
        profileImage: updatedUser.profileImage || null,
        bio: updatedUser.bio || null,
        phone: updatedUser.phone || null,
        verification: {
          emailVerified: updatedUser.emailVerified || false,
          phoneVerified: false,
          idVerified: updatedUser.verification === 'verified',
        },
        createdAt: updatedUser.createdAt ? updatedUser.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updatedUser.updatedAt ? updatedUser.updatedAt.toISOString() : new Date().toISOString(),
        preferences: updatedUser.preferences || null,
      };

      return {
        success: true,
        data: {
          user: transformedUser,
        },
        message: 'User updated successfully',
      };
    } catch (error) {
      console.error('Error in updateUser:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  async deleteUser(id: string) {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Prevent deleting super_admin users (safety check)
      if (existingUser.role === 'super_admin') {
        throw new ForbiddenException('Cannot delete super admin users');
      }

      // Delete user
      await this.prisma.user.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error('Error in deleteUser:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }
}








