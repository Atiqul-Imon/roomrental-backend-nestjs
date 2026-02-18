import { IsString, IsNumber, IsOptional, Min, Max, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID of the user being reviewed' })
  @IsUUID(4, { message: 'Reviewee ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Reviewee ID is required' })
  revieweeId!: string;

  @ApiProperty({ required: false, description: 'ID of the listing being reviewed (optional)' })
  @IsUUID(4, { message: 'Listing ID must be a valid UUID' })
  @IsOptional()
  listingId?: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Rating from 1 to 5' })
  @IsNumber({}, { message: 'Rating must be a number' })
  @IsNotEmpty({ message: 'Rating is required' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating must not exceed 5' })
  rating!: number;

  @ApiProperty({ required: false, description: 'Review comment (optional)' })
  @IsString({ message: 'Comment must be a string' })
  @IsOptional()
  @MaxLength(1000, { message: 'Comment must not exceed 1000 characters' })
  comment?: string;
}
































