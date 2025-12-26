import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SavedSearchesService } from './saved-searches.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Saved Searches')
@Controller('saved-searches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedSearchesController {
  constructor(private readonly savedSearchesService: SavedSearchesService) {}

  @Post()
  @ApiOperation({ summary: 'Save a search' })
  create(@Body() createDto: CreateSavedSearchDto, @CurrentUser() user: any) {
    return this.savedSearchesService.create(user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all saved searches for current user' })
  findAll(@CurrentUser() user: any) {
    return this.savedSearchesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved search by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.savedSearchesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved search' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSavedSearchDto,
    @CurrentUser() user: any,
  ) {
    return this.savedSearchesService.update(id, user.id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved search' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.savedSearchesService.remove(id, user.id);
  }
}

