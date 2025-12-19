import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('cities')
  @ApiOperation({ summary: 'Get all cities with listings' })
  getCities() {
    return this.searchService.getCities();
  }

  @Get('states')
  @ApiOperation({ summary: 'Get all states with listings' })
  getStates() {
    return this.searchService.getStates();
  }

  @Get('amenities')
  @ApiOperation({ summary: 'Get all available amenities' })
  getAmenities() {
    return this.searchService.getAmenities();
  }

  @Get('price-range')
  @ApiOperation({ summary: 'Get price range for available listings' })
  getPriceRange() {
    return this.searchService.getPriceRange();
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get location search suggestions' })
  getSuggestions(@Query('q') query: string) {
    return this.searchService.getSuggestions(query || '');
  }
}



