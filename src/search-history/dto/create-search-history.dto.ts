import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSearchHistoryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  searchQuery?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  resultsCount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clickedListingId?: string;
}

