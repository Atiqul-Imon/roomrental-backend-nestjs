import { IsString, IsBoolean, IsOptional, IsObject, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSavedSearchDto {
  @ApiProperty({ description: 'Name for the saved search', example: 'Apartments near UCLA' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name!: string;

  @ApiProperty({ description: 'Search parameters object', example: { city: 'Los Angeles', minPrice: 500 } })
  @IsObject({ message: 'Search parameters must be an object' })
  @IsNotEmpty({ message: 'Search parameters are required' })
  searchParams!: Record<string, any>;

  @ApiProperty({ required: false, default: true, description: 'Enable email alerts for new listings matching this search' })
  @IsBoolean({ message: 'Email alerts must be a boolean' })
  @IsOptional()
  emailAlerts?: boolean;
}





















