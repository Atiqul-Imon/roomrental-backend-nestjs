import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { SearchHistoryService } from '../search-history/search-history.service';

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    @Inject(forwardRef(() => SearchHistoryService))
    private searchHistoryService: SearchHistoryService,
  ) {}

  async create(landlordId: string, createDto: CreateListingDto, userRole?: string) {
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

    // Determine listing status - all listings are published immediately
    // Use the provided status or default to 'available' for immediate publication
    const listingStatus = createDto.status || 'available';

    const listing = await this.prisma.listing.create({
      data: {
        ...rest,
        status: listingStatus,
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

    // Cache invalidation - invalidate search static data and all listings cache
    await Promise.all([
      this.cache.del('search:cities'),
      this.cache.del('search:states'),
      this.cache.del('search:amenities'),
      this.cache.del('search:price-range'),
      this.cache.invalidatePattern(`my-listings:${landlordId}:*`), // User's listings
      this.cache.invalidatePattern('listings:*'), // Invalidate all listings cache for immediate visibility
    ]);

    return {
      success: true,
      data: listing,
    };
  }

  async findAll(searchDto: SearchListingsDto, userId: string | null = null) {
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
      landlordId,
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
      landlordId,
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

        // Landlord filter
        if (landlordId) {
          where.landlordId = landlordId;
        }

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

        // Track search history (async, don't wait)
        this.trackSearchHistory(userId, searchDto, total).catch((err) => {
          console.error('Error tracking search history:', err);
        });

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

  private async trackSearchHistory(userId: string | null, searchDto: SearchListingsDto, resultsCount: number) {
    try {
      // Build filters object
      const filters: Record<string, any> = {};
      if (searchDto.city) filters.city = searchDto.city;
      if (searchDto.state) filters.state = searchDto.state;
      if (searchDto.minPrice) filters.minPrice = searchDto.minPrice;
      if (searchDto.maxPrice) filters.maxPrice = searchDto.maxPrice;
      if (searchDto.amenities && searchDto.amenities.length > 0) filters.amenities = searchDto.amenities;
      if (searchDto.propertyType) filters.propertyType = searchDto.propertyType;
      if (searchDto.petFriendly !== undefined) filters.petFriendly = searchDto.petFriendly;
      if (searchDto.minBedrooms) filters.minBedrooms = searchDto.minBedrooms;
      if (searchDto.maxBedrooms) filters.maxBedrooms = searchDto.maxBedrooms;

      await this.searchHistoryService.create(userId, {
        searchQuery: searchDto.search || null,
        filters: Object.keys(filters).length > 0 ? filters : null,
        resultsCount,
      });
    } catch (error) {
      // Silently fail - search history tracking shouldn't break search
      console.error('Failed to track search history:', error);
    }
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

  async update(id: string, userId: string, updateDto: UpdateListingDto, userRole?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Allow admins, super_admins, and staff to update any listing
    const isAdmin = userRole && ['admin', 'super_admin', 'staff'].includes(userRole);
    if (!isAdmin && listing.landlordId !== userId) {
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

    // Cache invalidation - invalidate specific keys and all listings cache
    await Promise.all([
      this.cache.del(`listing:${id}`), // Specific listing
      this.cache.invalidatePattern(`my-listings:${userId}:*`), // User's listings
      this.cache.invalidatePattern('listings:*'), // Invalidate all listings cache for immediate visibility
      // Only invalidate search caches if location changed
      ...(updateDto.location ? [
        this.cache.del('search:cities'),
        this.cache.del('search:states'),
      ] : []),
    ]);

    return {
      success: true,
      data: updated,
    };
  }

  async remove(id: string, userId: string, userRole?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Allow admins, super_admins, and staff to delete any listing
    const isAdmin = userRole && ['admin', 'super_admin', 'staff'].includes(userRole);
    if (!isAdmin && listing.landlordId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.prisma.listing.delete({
      where: { id },
    });

    // Cache invalidation - invalidate specific keys and all listings cache
    await Promise.all([
      this.cache.del(`listing:${id}`), // Specific listing
      this.cache.invalidatePattern(`my-listings:${userId}:*`), // User's listings
      this.cache.invalidatePattern('listings:*'), // Invalidate all listings cache for immediate visibility
    ]);

    return {
      success: true,
      message: 'Listing deleted successfully',
    };
  }

  async findMyListings(landlordId: string, query: any) {
    try {
      const { status, page = 1, limit = 12, search } = query;
      const pageNum = parseInt(String(page), 10) || 1;
      const limitNum = parseInt(String(limit), 10) || 12;
      const cacheKey = `my-listings:${landlordId}:${status}:${pageNum}:${limitNum}:${search || ''}`;

      // Try to get from cache (5 minutes TTL)
      return this.cache.getOrSet(
        cacheKey,
        async () => {
          const skip = (pageNum - 1) * limitNum;

          // Build where clause - use AND when combining landlordId with OR search
          const whereConditions: any[] = [{ landlordId }];
          
          if (status && status !== 'all') {
            whereConditions.push({ status });
          }

          // Full-text search - must be combined with AND
          if (search) {
            whereConditions.push({
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { state: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
              ],
            });
          }

          // Use AND if we have multiple conditions, otherwise use the single condition
          const where = whereConditions.length > 1 
            ? { AND: whereConditions }
            : whereConditions[0];

          const [listings, total] = await Promise.all([
            this.prisma.listing.findMany({
              where,
              skip,
              take: limitNum,
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
              page: pageNum,
              limit: limitNum,
              totalPages: Math.ceil(total / limitNum),
            },
          };
        },
        300, // 5 minutes cache
      );
    } catch (error) {
      console.error('Error in findMyListings:', error);
      throw error;
    }
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

  async updateStatus(id: string, userId: string, status: string, userRole?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Allow admins, super_admins, and staff to update any listing status
    const isAdmin = userRole && ['admin', 'super_admin', 'staff'].includes(userRole);
    if (!isAdmin && listing.landlordId !== userId) {
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

    // Cache invalidation - invalidate specific keys and all listings cache
    // Always invalidate the landlord's cache, and also the requester's if different (e.g., admin)
    const cacheInvalidations = [
      this.cache.del(`listing:${id}`), // Specific listing
      this.cache.invalidatePattern(`my-listings:${listing.landlordId}:*`), // Landlord's listings (always invalidate the actual landlord's cache)
      this.cache.invalidatePattern('listings:*'), // Invalidate all listings cache for immediate visibility
    ];
    
    // Also invalidate requester's cache if different (e.g., admin viewing their own dashboard)
    if (listing.landlordId !== userId) {
      cacheInvalidations.push(this.cache.invalidatePattern(`my-listings:${userId}:*`));
    }
    
    await Promise.all(cacheInvalidations);

    return {
      success: true,
      data: updated,
    };
  }

  async getFilterCounts(searchDto: SearchListingsDto) {
    const {
      city,
      state,
      minPrice,
      maxPrice,
      search,
      availabilityDate,
      amenities,
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
      status = 'active',
    } = searchDto;

    // Build base where clause (excluding the filter we're counting)
    const baseWhere: any = { status };

    if (city) baseWhere.city = { contains: city, mode: 'insensitive' };
    if (state) baseWhere.state = { contains: state, mode: 'insensitive' };
    if (minPrice !== undefined) baseWhere.price = { ...baseWhere.price, gte: minPrice };
    if (maxPrice !== undefined) baseWhere.price = { ...baseWhere.price, lte: maxPrice };
    if (availabilityDate) {
      baseWhere.availabilityDate = { lte: new Date(availabilityDate) };
    }
    if (amenities && amenities.length > 0) {
      baseWhere.amenities = { hasSome: amenities };
    }
    if (minBedrooms !== undefined) baseWhere.bedrooms = { ...baseWhere.bedrooms, gte: minBedrooms };
    if (maxBedrooms !== undefined) baseWhere.bedrooms = { ...baseWhere.bedrooms, lte: maxBedrooms };
    if (minBathrooms !== undefined) baseWhere.bathrooms = { ...baseWhere.bathrooms, gte: minBathrooms };
    if (maxBathrooms !== undefined) baseWhere.bathrooms = { ...baseWhere.bathrooms, lte: maxBathrooms };
    if (minSquareFeet !== undefined) baseWhere.squareFeet = { ...baseWhere.squareFeet, gte: minSquareFeet };
    if (maxSquareFeet !== undefined) baseWhere.squareFeet = { ...baseWhere.squareFeet, lte: maxSquareFeet };
    if (propertyType) baseWhere.propertyType = propertyType;
    if (petFriendly !== undefined) baseWhere.petFriendly = petFriendly;
    if (smokingAllowed !== undefined) baseWhere.smokingAllowed = smokingAllowed;
    if (genderPreference) baseWhere.genderPreference = genderPreference;
    if (parkingAvailable !== undefined) baseWhere.parkingAvailable = parkingAvailable;
    if (minWalkabilityScore !== undefined) baseWhere.walkabilityScore = { gte: minWalkabilityScore };
    if (nearbyUniversities && nearbyUniversities.length > 0) {
      baseWhere.nearbyUniversities = { hasSome: nearbyUniversities };
    }

    if (search) {
      baseWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get all unique values for faceting
    const allListings = await this.prisma.listing.findMany({
      where: baseWhere,
      select: {
        amenities: true,
        city: true,
        state: true,
        propertyType: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        squareFeet: true,
        petFriendly: true,
        smokingAllowed: true,
        genderPreference: true,
        parkingAvailable: true,
      },
    });

    // Count amenities
    const amenityCounts: Record<string, number> = {};
    allListings.forEach((listing) => {
      listing.amenities.forEach((amenity) => {
        amenityCounts[amenity] = (amenityCounts[amenity] || 0) + 1;
      });
    });

    // Count cities
    const cityCounts: Record<string, number> = {};
    allListings.forEach((listing) => {
      if (listing.city) {
        cityCounts[listing.city] = (cityCounts[listing.city] || 0) + 1;
      }
    });

    // Count states
    const stateCounts: Record<string, number> = {};
    allListings.forEach((listing) => {
      if (listing.state) {
        stateCounts[listing.state] = (stateCounts[listing.state] || 0) + 1;
      }
    });

    // Count property types
    const propertyTypeCounts: Record<string, number> = {};
    allListings.forEach((listing) => {
      if (listing.propertyType) {
        propertyTypeCounts[listing.propertyType] = (propertyTypeCounts[listing.propertyType] || 0) + 1;
      }
    });

    // Price ranges
    const prices = allListings.map((l) => l.price).filter((p) => p !== null);
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 10000,
    };

    // Bedroom counts
    const bedroomCounts: Record<string, number> = {};
    allListings.forEach((listing) => {
      if (listing.bedrooms !== null) {
        const key = listing.bedrooms.toString();
        bedroomCounts[key] = (bedroomCounts[key] || 0) + 1;
      }
    });

    // Bathroom counts
    const bathroomCounts: Record<string, number> = {};
    allListings.forEach((listing) => {
      if (listing.bathrooms !== null) {
        const key = listing.bathrooms.toString();
        bathroomCounts[key] = (bathroomCounts[key] || 0) + 1;
      }
    });

    // Boolean feature counts
    const featureCounts = {
      petFriendly: allListings.filter((l) => l.petFriendly).length,
      smokingAllowed: allListings.filter((l) => l.smokingAllowed).length,
      parkingAvailable: allListings.filter((l) => l.parkingAvailable).length,
    };

    // Gender preference counts
    const genderPreferenceCounts: Record<string, number> = {};
    allListings.forEach((listing) => {
      if (listing.genderPreference) {
        genderPreferenceCounts[listing.genderPreference] = (genderPreferenceCounts[listing.genderPreference] || 0) + 1;
      }
    });

    return {
      success: true,
      data: {
        amenities: amenityCounts,
        cities: cityCounts,
        states: stateCounts,
        propertyTypes: propertyTypeCounts,
        bedrooms: bedroomCounts,
        bathrooms: bathroomCounts,
        priceRange,
        features: featureCounts,
        genderPreferences: genderPreferenceCounts,
      },
    };
  }
}



