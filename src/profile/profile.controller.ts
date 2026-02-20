import { Controller, Get, Patch, Body, Param, UseGuards, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SwitchRoleDto } from './dto/switch-role.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@Body() updateData: any, @CurrentUser() user: any) {
    return this.profileService.updateProfile(user.id, updateData);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  getUserProfile(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profileService.getUserProfile(id, user?.id || '');
  }

  @Get(':id/full')
  @ApiOperation({ summary: 'Get full profile data including ratings and stats (batch endpoint)' })
  getFullProfileData(@Param('id') id: string, @CurrentUser() user: any) {
    return this.profileService.getFullProfileData(id, user?.id || '');
  }

  @Post('switch-role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Switch user role between student and landlord',
    description: 'Allows users to switch between student and landlord modes. Returns new JWT tokens with updated role. Rate limited to 5 switches per day.',
  })
  switchRole(@CurrentUser() user: any, @Body() switchRoleDto: SwitchRoleDto) {
    return this.profileService.switchRole(user.id, switchRoleDto.newRole);
  }
}
































