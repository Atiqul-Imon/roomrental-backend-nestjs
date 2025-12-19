import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':listingId')
  @ApiOperation({ summary: 'Add listing to favorites' })
  add(@Param('listingId') listingId: string, @CurrentUser() user: any) {
    return this.favoritesService.add(user.id, listingId);
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Remove listing from favorites' })
  remove(@Param('listingId') listingId: string, @CurrentUser() user: any) {
    return this.favoritesService.remove(user.id, listingId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user favorites' })
  findAll(@Query() query: any, @CurrentUser() user: any) {
    return this.favoritesService.findAll(user.id, query);
  }

  @Get(':listingId')
  @ApiOperation({ summary: 'Check if listing is favorited' })
  checkFavorite(@Param('listingId') listingId: string, @CurrentUser() user: any) {
    return this.favoritesService.checkFavorite(user.id, listingId);
  }
}



