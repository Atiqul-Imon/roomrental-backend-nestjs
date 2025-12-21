import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsDateString,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum ListingStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  PENDING = 'pending',
  INACTIVE = 'inactive',
}

class LocationDto {
  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  zip?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class CreateListingDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  bedrooms: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  bathrooms: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  squareFeet?: number;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ enum: ListingStatus, default: ListingStatus.AVAILABLE })
  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;

  @ApiProperty()
  @IsDateString()
  availabilityDate: string;
}








