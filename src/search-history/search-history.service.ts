import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';

@Injectable()
export class SearchHistoryService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string | null, createDto: CreateSearchHistoryDto) {
    const searchHistory = await this.prisma.searchHistory.create({
      data: {
        userId: userId || null,
        searchQuery: createDto.searchQuery || null,
        filters: createDto.filters || null,
        resultsCount: createDto.resultsCount || 0,
        clickedListingId: createDto.clickedListingId || null,
      },
    });

    return {
      success: true,
      data: searchHistory,
    };
  }

  async findAll(userId: string | null, limit: number = 50) {
    const where = userId ? { userId } : { userId: null };
    
    const searchHistory = await this.prisma.searchHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: searchHistory,
    };
  }

  async findOne(id: string) {
    const searchHistory = await this.prisma.searchHistory.findUnique({
      where: { id },
    });

    if (!searchHistory) {
      return {
        success: false,
        message: 'Search history not found',
      };
    }

    return {
      success: true,
      data: searchHistory,
    };
  }

  async remove(id: string, userId: string | null) {
    const searchHistory = await this.prisma.searchHistory.findUnique({
      where: { id },
    });

    if (!searchHistory) {
      return {
        success: false,
        message: 'Search history not found',
      };
    }

    // Only allow deletion if user owns it or it's anonymous (userId is null)
    if (searchHistory.userId && searchHistory.userId !== userId) {
      return {
        success: false,
        message: 'You do not have permission to delete this search history',
      };
    }

    await this.prisma.searchHistory.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Search history deleted successfully',
    };
  }

  async clearAll(userId: string | null) {
    const where = userId ? { userId } : { userId: null };
    
    await this.prisma.searchHistory.deleteMany({
      where,
    });

    return {
      success: true,
      message: 'All search history cleared successfully',
    };
  }

  async getAnalytics(userId?: string) {
    const where = userId ? { userId } : {};
    
    const [totalSearches, uniqueSearches, popularQueries, popularFilters] = await Promise.all([
      this.prisma.searchHistory.count({ where }),
      this.prisma.searchHistory.groupBy({
        by: ['searchQuery'],
        where: {
          ...where,
          searchQuery: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            searchQuery: 'desc',
          },
        },
        take: 10,
      }),
      this.prisma.searchHistory.findMany({
        where: {
          ...where,
          searchQuery: { not: null },
        },
        select: {
          searchQuery: true,
        },
        distinct: ['searchQuery'],
        take: 10,
      }),
      this.prisma.searchHistory.findMany({
        where: {
          ...where,
          filters: { not: null },
        },
        select: {
          filters: true,
        },
        take: 100,
      }),
    ]);

    // Analyze popular filters
    const filterCounts: Record<string, number> = {};
    popularFilters.forEach((item) => {
      if (item.filters && typeof item.filters === 'object') {
        Object.keys(item.filters).forEach((key) => {
          filterCounts[key] = (filterCounts[key] || 0) + 1;
        });
      }
    });

    return {
      success: true,
      data: {
        totalSearches,
        uniqueSearches: uniqueSearches.length,
        popularQueries: popularQueries.map((q) => q.searchQuery).filter(Boolean),
        popularFilters: Object.entries(filterCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([key, count]) => ({ filter: key, count })),
      },
    };
  }
}

