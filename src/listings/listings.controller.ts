import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('landlord', 'admin', 'super_admin', 'staff')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new listing' })
  create(@Body() createListingDto: CreateListingDto, @CurrentUser() user: any) {
    // If an admin provides a landlordId, use it. Otherwise, attribute to the admin.
    const attributedLandlordId = (user.role !== 'landlord' && createListingDto.landlordId)
      ? createListingDto.landlordId
      : user.id;
    return this.listingsService.create(attributedLandlordId, createListingDto, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list listings' })
  findAll(@Query() searchDto: SearchListingsDto, @CurrentUser() user?: any) {
    // Pass userId to service for search history tracking
    return this.listingsService.findAll(searchDto, user?.id || null);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing' })
  update(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @CurrentUser() user: any,
  ) {
    return this.listingsService.update(id, user.id, updateListingDto, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete listing' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.listingsService.remove(id, user.id, user.role);
  }

  @Get('my/listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('landlord')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my listings (landlord only)' })
  findMyListings(@Query() query: any, @CurrentUser() user: any) {
    return this.listingsService.findMyListings(user.id, query);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user: any,
  ) {
    return this.listingsService.updateStatus(id, user.id, body.status, user.role);
  }

  @Get('filters/counts')
  @ApiOperation({ summary: 'Get filter counts for faceted search' })
  getFilterCounts(@Query() searchDto: SearchListingsDto) {
    return this.listingsService.getFilterCounts(searchDto);
  }
}



