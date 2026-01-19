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
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum ListingStatus {
  AVAILABLE = 'available',
  RENTED = 'rented',
  PENDING = 'pending',
  INACTIVE = 'inactive',
}

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  DORM = 'dorm',
  STUDIO = 'studio',
  SHARED_ROOM = 'shared_room',
  PRIVATE_ROOM = 'private_room',
}

export enum GenderPreference {
  MALE = 'male',
  FEMALE = 'female',
  COED = 'coed',
  ANY = 'any',
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
  @ApiProperty({ maxLength: 200, minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @ApiProperty({ maxLength: 2000, minLength: 20 })
  @IsString()
  @MinLength(20, { message: 'Description must be at least 20 characters long' })
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
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

  @ApiProperty({ required: false, description: 'Optional: Assign this listing to an existing landlord (Admin only)' })
  @IsString()
  @IsOptional()
  landlordId?: string;

  @ApiProperty({ enum: PropertyType, required: false })
  @IsEnum(PropertyType)
  @IsOptional()
  propertyType?: PropertyType;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  petFriendly?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  smokingAllowed?: boolean;

  @ApiProperty({ enum: GenderPreference, required: false, default: GenderPreference.ANY })
  @IsEnum(GenderPreference)
  @IsOptional()
  genderPreference?: GenderPreference;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  parkingAvailable?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  walkabilityScore?: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  nearbyUniversities?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  nearbyTransit?: string[];
}








