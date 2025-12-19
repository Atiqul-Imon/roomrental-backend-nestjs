import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async create(landlordId: string, createDto: CreateListingDto) {
    const { location, availabilityDate, ...rest } = createDto;

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
  }

  async findOne(id: string) {
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

    return {
      success: true,
      message: 'Listing deleted successfully',
    };
  }

  async findMyListings(landlordId: string, query: any) {
    const { status, page = 1, limit = 12 } = query;
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

    return {
      success: true,
      data: updated,
    };
  }
}



