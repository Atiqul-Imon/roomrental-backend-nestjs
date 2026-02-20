import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchRoleDto {
  @ApiProperty({
    description: 'New role to switch to (student or landlord)',
    enum: ['student', 'landlord'],
    example: 'landlord',
  })
  @IsEnum(['student', 'landlord'], {
    message: 'Role must be either student or landlord',
  })
  @IsNotEmpty()
  newRole!: 'student' | 'landlord';
}
