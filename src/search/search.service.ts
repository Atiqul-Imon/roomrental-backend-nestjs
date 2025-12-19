import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getCities() {
    const cacheKey = 'search:cities';
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const cities = await this.prisma.listing.findMany({
      select: {
        city: true,
        state: true,
      },
      distinct: ['city', 'state'],
    });

    const result = {
      success: true,
      data: cities,
    };

    // Cache for 1 hour (3600 seconds) - cities change rarely
    await this.cacheService.set(cacheKey, result, 3600);
    return result;
  }

  async getStates() {
    const cacheKey = 'search:states';
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const states = await this.prisma.listing.findMany({
      select: {
        state: true,
      },
      distinct: ['state'],
    });

    const result = {
      success: true,
      data: states.map((s) => s.state),
    };

    // Cache for 1 hour (3600 seconds) - states change rarely
    await this.cacheService.set(cacheKey, result, 3600);
    return result;
  }

  async getAmenities() {
    const cacheKey = 'search:amenities';
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const listings = await this.prisma.listing.findMany({
      select: {
        amenities: true,
      },
    });

    const allAmenities = new Set<string>();
    listings.forEach((listing) => {
      listing.amenities.forEach((amenity) => allAmenities.add(amenity));
    });

    const result = {
      success: true,
      data: Array.from(allAmenities).sort(),
    };

    // Cache for 1 hour (3600 seconds) - amenities change rarely
    await this.cacheService.set(cacheKey, result, 3600);
    return result;
  }

  async getPriceRange() {
    const cacheKey = 'search:price-range';
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const result = await this.prisma.listing.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: {
        status: 'available',
      },
    });

    const response = {
      success: true,
      data: {
        min: result._min.price || 0,
        max: result._max.price || 0,
      },
    };

    // Cache for 5 minutes (300 seconds) - price range updates more frequently
    await this.cacheService.set(cacheKey, response, 300);
    return response;
  }

  async getSuggestions(query: string) {
    if (!query || query.length < 2) {
      return {
        success: true,
        data: { cities: [], states: [] },
      };
    }

    const [cities, states] = await Promise.all([
      this.prisma.listing.findMany({
        where: {
          city: { contains: query, mode: 'insensitive' },
        },
        select: { city: true, state: true },
        distinct: ['city', 'state'],
        take: 10,
      }),
      this.prisma.listing.findMany({
        where: {
          state: { contains: query, mode: 'insensitive' },
        },
        select: { state: true },
        distinct: ['state'],
        take: 10,
      }),
    ]);

    return {
      success: true,
      data: {
        cities: cities.map((c) => `${c.city}, ${c.state}`),
        states: states.map((s) => s.state),
      },
    };
  }
}



