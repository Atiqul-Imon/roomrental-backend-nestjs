import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlogPostStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trimStringArray = (maxLen: number, maxItems: number) =>
  Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim().slice(0, maxLen))
      .filter(Boolean)
      .slice(0, maxItems);
  });

export class CreateBlogPostDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  excerpt?: string;

  /** TipTap / ProseMirror JSON document — @IsObject required or ValidationPipe whitelist strips/forbids this field */
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  contentJson!: Record<string, unknown>;

  @ApiProperty({ enum: BlogPostStatus })
  @IsEnum(BlogPostStatus)
  status!: BlogPostStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: false })
  publishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: false })
  scheduledFor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined) return undefined;
    if (value === null) return null;
    return typeof value === 'string' ? value.trim() : value;
  })
  @ValidateIf((_object, value) => typeof value === 'string' && value.length > 0)
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  canonicalUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ogImageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  focusKeyword?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @trimStringArray(200, 50)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  keywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsIndex?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  robotsFollow?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  /** Tag labels (names); slugs are derived server-side */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @trimStringArray(80, 40)
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags?: string[];
}
