import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString({ message: 'OTP code must be a string' })
  @IsNotEmpty({ message: 'OTP code is required' })
  @MinLength(6, { message: 'OTP code must be exactly 6 characters' })
  @MaxLength(6, { message: 'OTP code must be exactly 6 characters' })
  code!: string;

  @ApiProperty({ example: 'registration', required: false, default: 'registration', enum: ['registration', 'password-reset', 'login'] })
  @IsString({ message: 'Purpose must be a string' })
  @IsOptional()
  @IsIn(['registration', 'password-reset', 'login'], { message: 'Purpose must be one of: registration, password-reset, login' })
  purpose?: string;
}

