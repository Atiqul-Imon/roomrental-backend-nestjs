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
        propertyType: createDto.propertyType || null,
        petFriendly: createDto.petFriendly ?? false,
        smokingAllowed: createDto.smokingAllowed ?? false,
        genderPreference: createDto.genderPreference || 'any',
        parkingAvailable: createDto.parkingAvailable ?? false,
        walkabilityScore: createDto.walkabilityScore || null,
        nearbyUniversities: createDto.nearbyUniversities || [],
        nearbyTransit: createDto.nearbyTransit || [],
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
      latitude,
      longitude,
      radius,
      // Advanced filters
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      minSquareFeet,
      maxSquareFeet,
      propertyType,
      petFriendly,
      smokingAllowed,
      genderPreference,
      parkingAvailable,
      minWalkabilityScore,
      nearbyUniversities,
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
      latitude,
      longitude,
      radius,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      minSquareFeet,
      maxSquareFeet,
      propertyType,
      petFriendly,
      smokingAllowed,
      genderPreference,
      parkingAvailable,
      minWalkabilityScore,
      nearbyUniversities: nearbyUniversities?.sort(),
    })}`;

    // Try to get from cache (5 minutes TTL)
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        const where: any = { status };

        // Location filters
        if (city) {
          where.city = { contains: city, mode: 'insensitive' };
        }

        if (state) {
          where.state = { contains: state, mode: 'insensitive' };
        }

        // Geospatial search (radius search)
        if (latitude !== undefined && longitude !== undefined && radius !== undefined) {
          // Calculate bounding box for radius search (approximation)
          // 1 degree latitude ≈ 69 miles
          // 1 degree longitude ≈ 69 * cos(latitude) miles
          const latDelta = radius / 69;
          const lonDelta = radius / (69 * Math.cos(latitude * Math.PI / 180));
          
          where.latitude = {
            gte: latitude - latDelta,
            lte: latitude + latDelta,
          };
          where.longitude = {
            gte: longitude - lonDelta,
            lte: longitude + lonDelta,
          };
          // Note: This is an approximation. For exact distance, use PostGIS or calculate distance in application
        }

        // Price filter
        if (minPrice !== undefined || maxPrice !== undefined) {
          where.price = {};
          if (minPrice !== undefined) where.price.gte = minPrice;
          if (maxPrice !== undefined) where.price.lte = maxPrice;
        }

        // Bedrooms filter
        if (minBedrooms !== undefined || maxBedrooms !== undefined) {
          where.bedrooms = {};
          if (minBedrooms !== undefined) where.bedrooms.gte = minBedrooms;
          if (maxBedrooms !== undefined) where.bedrooms.lte = maxBedrooms;
        }

        // Bathrooms filter
        if (minBathrooms !== undefined || maxBathrooms !== undefined) {
          where.bathrooms = {};
          if (minBathrooms !== undefined) where.bathrooms.gte = minBathrooms;
          if (maxBathrooms !== undefined) where.bathrooms.lte = maxBathrooms;
        }

        // Square feet filter
        if (minSquareFeet !== undefined || maxSquareFeet !== undefined) {
          where.squareFeet = {};
          if (minSquareFeet !== undefined) where.squareFeet.gte = minSquareFeet;
          if (maxSquareFeet !== undefined) where.squareFeet.lte = maxSquareFeet;
        }

        // Property type filter
        if (propertyType) {
          where.propertyType = propertyType;
        }

        // Boolean filters
        if (petFriendly !== undefined) {
          where.petFriendly = petFriendly;
        }

        if (smokingAllowed !== undefined) {
          where.smokingAllowed = smokingAllowed;
        }

        if (parkingAvailable !== undefined) {
          where.parkingAvailable = parkingAvailable;
        }

        // Gender preference filter
        if (genderPreference && genderPreference !== 'any') {
          where.genderPreference = genderPreference;
        }

        // Walkability score filter
        if (minWalkabilityScore !== undefined) {
          where.walkabilityScore = { gte: minWalkabilityScore };
        }

        // Nearby universities filter
        if (nearbyUniversities && nearbyUniversities.length > 0) {
          where.nearbyUniversities = { hasSome: nearbyUniversities };
        }

        // Amenities filter
        if (amenities && amenities.length > 0) {
          where.amenities = { hasEvery: amenities };
        }

        // Availability date filter
        if (availabilityDate) {
          where.availabilityDate = { gte: new Date(availabilityDate) };
        }

        // Full-text search with improved relevance
        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { state: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ];
        }

        // Enhanced sorting options
        const orderBy: any = {};
        if (sort === 'price') orderBy.price = 'asc';
        else if (sort === 'price-desc') orderBy.price = 'desc';
        else if (sort === 'date' || sort === 'newest') orderBy.createdAt = 'desc';
        else if (sort === 'oldest') orderBy.createdAt = 'asc';
        else if (sort === 'popular' || sort === 'views') orderBy.viewCount = 'desc';
        else if (sort === 'squareFeet') orderBy.squareFeet = 'desc';
        else if (sort === 'squareFeet-asc') orderBy.squareFeet = 'asc';
        else if (sort === 'distance' && latitude && longitude) {
          // For distance sorting, we'll need to calculate distance in the application
          // For now, sort by closest coordinates
          orderBy.latitude = 'asc';
          orderBy.longitude = 'asc';
        }
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

        // Calculate distance for geospatial searches
        let listingsWithDistance = listings;
        if (latitude !== undefined && longitude !== undefined) {
          listingsWithDistance = listings.map((listing) => {
            if (listing.latitude && listing.longitude) {
              const distance = this.calculateDistance(
                latitude,
                longitude,
                listing.latitude,
                listing.longitude,
              );
              return { ...listing, distance };
            }
            return listing;
          });

          // Sort by distance if distance sorting is requested
          if (sort === 'distance') {
            listingsWithDistance.sort((a, b) => {
              const distA = (a as any).distance || Infinity;
              const distB = (b as any).distance || Infinity;
              return distA - distB;
            });
          }
        }

        return {
          success: true,
          data: {
            listings: listingsWithDistance,
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

  // Helper method to calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal place
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
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



