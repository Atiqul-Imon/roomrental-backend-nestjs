import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async add(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    try {
      const favorite = await this.prisma.favorite.create({
        data: { userId, listingId },
        include: {
          listing: {
            include: {
              landlord: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      });

      return {
        success: true,
        data: favorite,
        message: 'Listing added to favorites',
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Listing already in favorites');
      }
      throw error;
    }
  }

  async remove(userId: string, listingId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_listingId: { userId, listingId },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: { userId_listingId: { userId, listingId } },
    });

    return {
      success: true,
      message: 'Listing removed from favorites',
    };
  }

  async findAll(userId: string, query: any) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          listing: {
            include: {
              landlord: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      success: true,
      data: {
        favorites,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async checkFavorite(userId: string, listingId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_listingId: { userId, listingId },
      },
    });

    return {
      success: true,
      data: {
        isFavorite: !!favorite,
      },
    };
  }
}



