import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(reviewerId: string, data: CreateReviewDto) {
    if (reviewerId === data.revieweeId) {
      throw new BadRequestException('Cannot review yourself');
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        reviewerId_revieweeId: {
          reviewerId,
          revieweeId: data.revieweeId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('You have already reviewed this user');
    }

    const review = await this.prisma.review.create({
      data: {
        reviewerId,
        revieweeId: data.revieweeId,
        listingId: data.listingId,
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    return {
      success: true,
      data: review,
    };
  }

  async findAll(query: any) {
    const { revieweeId, listingId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (revieweeId) {
      where.revieweeId = revieweeId;
    }
    if (listingId) {
      where.listingId = listingId;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId !== userId) {
      throw new BadRequestException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }

  async getRatingStats(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { revieweeId: userId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return {
        success: true,
        data: {
          averageRating: 0,
          totalReviews: 0,
        },
      };
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    return {
      success: true,
      data: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
      },
    };
  }
}



