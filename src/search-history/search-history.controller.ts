import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchHistoryService } from './search-history.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Search History')
@Controller('search-history')
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a search history entry' })
  create(
    @Body() createDto: CreateSearchHistoryDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id || null;
    return this.searchHistoryService.create(userId, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search history for current user' })
  findAll(@Query('limit') limit: string, @CurrentUser() user: any) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.searchHistoryService.findAll(user.id, limitNum);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search analytics (admin or own data)' })
  getAnalytics(@CurrentUser() user: any) {
    return this.searchHistoryService.getAnalytics(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a search history entry by ID' })
  findOne(@Param('id') id: string) {
    return this.searchHistoryService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a search history entry' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.searchHistoryService.remove(id, user.id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear all search history for current user' })
  clearAll(@CurrentUser() user: any) {
    return this.searchHistoryService.clearAll(user.id);
  }
}

