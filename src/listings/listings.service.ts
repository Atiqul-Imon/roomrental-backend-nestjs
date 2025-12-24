import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async create(landlordId: string, createDto: CreateListingDto) {
    const { location, availabilityDate, ...rest } = createDto;

    // If a landlordId is explicitly provided (by an admin), validate it
    if (createDto.landlordId && createDto.landlordId !== landlordId) {
      const targetLandlord = await this.prisma.user.findUnique({
        where: { id: createDto.landlordId },
      });
      if (!targetLandlord || targetLandlord.role !== 'landlord') {
        throw new BadRequestException('Invalid landlordId provided. User must exist and have a "landlord" role.');
      }
      landlordId = createDto.landlordId; // Use the provided landlordId
    }

    const listing = await this.prisma.listing.create({
      data: {
        ...rest,
        landlordId,
        city: location.city,
        state: location.state,
        zip: location.zip || null,
        address: location.address || null,
        latitude: location.latitude || null,
        longitude: location.longitude || null,
        availabilityDate: new Date(availabilityDate),
        amenities: createDto.amenities || [],
      },
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
    });

    // Invalidate listings cache and search static data cache
    await Promise.all([
      this.cache.invalidatePattern('listings:*'),
      this.cache.del('search:cities'),
      this.cache.del('search:states'),
      this.cache.del('search:amenities'),
      this.cache.del('search:price-range'),
    ]);

    return {
      success: true,
      data: listing,
    };
  }

  async findAll(searchDto: SearchListingsDto) {
    const {
      city,
      state,
      minPrice,
      maxPrice,
      amenities,
      availabilityDate,
      search,
      status = 'available',
      page = 1,
      limit = 12,
      sort = 'createdAt',
    } = searchDto;

    // Create cache key from search parameters
    const cacheKey = `listings:${JSON.stringify({
      city,
      state,
      minPrice,
      maxPrice,
      amenities: amenities?.sort(),
      availabilityDate,
      search,
      status,
      page,
      limit,
      sort,
    })}`;

    // Try to get from cache (5 minutes TTL)
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        const where: any = { status };

        if (city) {
          where.city = { contains: city, mode: 'insensitive' };
        }

        if (state) {
          where.state = { contains: state, mode: 'insensitive' };
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
          where.price = {};
          if (minPrice !== undefined) where.price.gte = minPrice;
          if (maxPrice !== undefined) where.price.lte = maxPrice;
        }

        if (amenities && amenities.length > 0) {
          where.amenities = { hasEvery: amenities };
        }

        if (availabilityDate) {
          where.availabilityDate = { gte: new Date(availabilityDate) };
        }

        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ];
        }

        const orderBy: any = {};
        if (sort === 'price') orderBy.price = 'asc';
        else if (sort === 'price-desc') orderBy.price = 'desc';
        else if (sort === 'date') orderBy.createdAt = 'desc';
        else orderBy.createdAt = 'desc';

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
                  profileImage: true,
                },
              },
            },
            orderBy,
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
      },
      300, // 5 minutes cache
    );
  }

  async findOne(id: string) {
    const cacheKey = `listing:${id}`;

    // Try to get from cache (2 minutes TTL)
    const result = await this.cache.getOrSet(
      cacheKey,
      async () => {
        const listing = await this.prisma.listing.findUnique({
          where: { id },
          include: {
            landlord: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
                bio: true,
                role: true,
              },
            },
          },
        });

        if (!listing) {
          throw new NotFoundException('Listing not found');
        }

        return {
          success: true,
          data: listing,
        };
      },
      120, // 2 minutes cache
    );

    return result;
  }

  async update(id: string, userId: string, updateDto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.landlordId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    const { location, availabilityDate, ...rest } = updateDto;

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        ...rest,
        ...(location && {
          city: location.city,
          state: location.state,
          zip: location.zip,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
        ...(availabilityDate && {
          availabilityDate: new Date(availabilityDate),
        }),
      },
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
    });

    // Invalidate cache for this listing, listings list, and search static data
    await Promise.all([
      this.cache.del(`listing:${id}`),
      this.cache.invalidatePattern('listings:*'),
      this.cache.del('search:cities'),
      this.cache.del('search:states'),
      this.cache.del('search:amenities'),
      this.cache.del('search:price-range'),
    ]);

    return {
      success: true,
      data: updated,
    };
  }

  async remove(id: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.landlordId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.prisma.listing.delete({
      where: { id },
    });

    // Invalidate cache for this listing, listings list, and search static data
    await Promise.all([
      this.cache.del(`listing:${id}`),
      this.cache.invalidatePattern('listings:*'),
      this.cache.del('search:cities'),
      this.cache.del('search:states'),
      this.cache.del('search:amenities'),
      this.cache.del('search:price-range'),
    ]);

    return {
      success: true,
      message: 'Listing deleted successfully',
    };
  }

  async findMyListings(landlordId: string, query: any) {
    const { status, page = 1, limit = 12 } = query;
    const cacheKey = `my-listings:${landlordId}:${status}:${page}:${limit}`;

    // Try to get from cache (5 minutes TTL)
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;

        const where: any = { landlordId };
        if (status && status !== 'all') {
          where.status = status;
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
                  profileImage: true,
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
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      300, // 5 minutes cache
    );
  }

  async updateStatus(id: string, userId: string, status: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.landlordId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    const updated = await this.prisma.listing.update({
      where: { id },
      data: { status: status as any },
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
    });

    // Invalidate cache for this listing, listings list, my-listings, and search static data
    await Promise.all([
      this.cache.del(`listing:${id}`),
      this.cache.invalidatePattern('listings:*'),
      this.cache.invalidatePattern(`my-listings:${userId}:*`),
      this.cache.del('search:price-range'), // Price range changes when status changes
    ]);

    return {
      success: true,
      data: updated,
    };
  }
}



