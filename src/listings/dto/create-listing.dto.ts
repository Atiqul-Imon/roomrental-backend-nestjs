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
  IsNotEmpty,
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
  @ApiProperty({ description: 'City name', example: 'Los Angeles' })
  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city!: string;

  @ApiProperty({ description: 'State name or abbreviation', example: 'CA' })
  @IsString({ message: 'State must be a string' })
  @IsNotEmpty({ message: 'State is required' })
  @MaxLength(50, { message: 'State must not exceed 50 characters' })
  state!: string;

  @ApiProperty({ required: false, description: 'ZIP code', example: '90001' })
  @IsString({ message: 'ZIP code must be a string' })
  @IsOptional()
  @MaxLength(10, { message: 'ZIP code must not exceed 10 characters' })
  zip?: string;

  @ApiProperty({ required: false, description: 'Street address', example: '123 Main St' })
  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  @MaxLength(200, { message: 'Address must not exceed 200 characters' })
  address?: string;

  @ApiProperty({ required: false, description: 'Latitude coordinate', example: 34.0522 })
  @IsNumber({}, { message: 'Latitude must be a number' })
  @IsOptional()
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude?: number;

  @ApiProperty({ required: false, description: 'Longitude coordinate', example: -118.2437 })
  @IsNumber({}, { message: 'Longitude must be a number' })
  @IsOptional()
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude?: number;
}

export class CreateListingDto {
  @ApiProperty({ maxLength: 200, minLength: 5 })
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title!: string;

  @ApiProperty({ maxLength: 2000, minLength: 20 })
  @IsString()
  @MinLength(20, { message: 'Description must be at least 20 characters long' })
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  bedrooms!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  bathrooms!: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  squareFeet?: number;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

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
  availabilityDate!: string;

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

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  billsIncluded?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  securityDeposit?: number;

  @ApiProperty({ required: false, enum: ['furnished', 'unfurnished', 'partially_furnished'] })
  @IsString()
  @IsOptional()
  roomFurnishing?: 'furnished' | 'unfurnished' | 'partially_furnished';

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  minStayMonths?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxStayMonths?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  currentRoomiesCount?: number;
}








