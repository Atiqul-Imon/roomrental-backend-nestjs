import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async getCities() {
    const cities = await this.prisma.listing.findMany({
      select: {
        city: true,
        state: true,
      },
      distinct: ['city', 'state'],
    });

    return {
      success: true,
      data: cities,
    };
  }

  async getStates() {
    const states = await this.prisma.listing.findMany({
      select: {
        state: true,
      },
      distinct: ['state'],
    });

    return {
      success: true,
      data: states.map((s) => s.state),
    };
  }

  async getAmenities() {
    const listings = await this.prisma.listing.findMany({
      select: {
        amenities: true,
      },
    });

    const allAmenities = new Set<string>();
    listings.forEach((listing) => {
      listing.amenities.forEach((amenity) => allAmenities.add(amenity));
    });

    return {
      success: true,
      data: Array.from(allAmenities).sort(),
    };
  }

  async getPriceRange() {
    const result = await this.prisma.listing.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: {
        status: 'available',
      },
    });

    return {
      success: true,
      data: {
        min: result._min.price || 0,
        max: result._max.price || 0,
      },
    };
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



