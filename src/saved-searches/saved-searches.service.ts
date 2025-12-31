import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';

@Injectable()
export class SavedSearchesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateSavedSearchDto) {
    const savedSearch = await this.prisma.savedSearch.create({
      data: {
        userId,
        name: createDto.name,
        searchParams: createDto.searchParams,
        emailAlerts: createDto.emailAlerts ?? true,
      },
    });

    return {
      success: true,
      data: savedSearch,
    };
  }

  async findAll(userId: string) {
    const savedSearches = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: savedSearches,
    };
  }

  async findOne(id: string, userId: string) {
    const savedSearch = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this saved search');
    }

    return {
      success: true,
      data: savedSearch,
    };
  }

  async update(id: string, userId: string, updateDto: UpdateSavedSearchDto) {
    const savedSearch = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this saved search');
    }

    const updated = await this.prisma.savedSearch.update({
      where: { id },
      data: updateDto,
    });

    return {
      success: true,
      data: updated,
    };
  }

  async remove(id: string, userId: string) {
    const savedSearch = await this.prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this saved search');
    }

    await this.prisma.savedSearch.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Saved search deleted successfully',
    };
  }
}










