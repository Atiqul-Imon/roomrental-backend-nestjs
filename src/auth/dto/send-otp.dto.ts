import { IsEmail, IsString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: 'registration', required: false, default: 'registration', enum: ['registration', 'password-reset', 'login'] })
  @IsString({ message: 'Purpose must be a string' })
  @IsOptional()
  @IsIn(['registration', 'password-reset', 'login'], { message: 'Purpose must be one of: registration, password-reset, login' })
  purpose?: string;
}

