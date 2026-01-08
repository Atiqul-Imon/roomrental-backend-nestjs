import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, MaxLength, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @ApiPropertyOptional({ description: 'Array of attachment URLs', type: [String], maxItems: 10 })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(10, { message: 'Cannot attach more than 10 files' })
  attachments?: string[];
}











