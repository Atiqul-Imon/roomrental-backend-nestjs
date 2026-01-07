import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMessageDto {
  @ApiProperty({ description: 'Updated message content', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content: string;
}







