import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  STUDENT = 'student',
  LANDLORD = 'landlord',
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password!: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.STUDENT, required: false })
  @IsEnum(UserRole, { message: 'Role must be either student or landlord' })
  @IsOptional()
  role?: UserRole;
}
































