import { Controller, Get, Query, Param, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin', 'staff')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (admin only)' })
  async getAllUsers(@Query() query: any) {
    try {
      return await this.adminService.getAllUsers(query);
    } catch (error) {
      console.error('Error in getAllUsers controller:', error);
      throw error;
    }
  }

  @Get('listings')
  @ApiOperation({ summary: 'Get all listings (admin only)' })
  async getAllListings(@Query() query: any) {
    try {
      return await this.adminService.getAllListings(query);
    } catch (error) {
      console.error('Error in getAllListings controller:', error);
      throw error;
    }
  }

  @Get('landlords')
  @ApiOperation({ summary: 'Get all landlords with stats (admin only)' })
  async getAllLandlords(@Query() query: any) {
    try {
      return await this.adminService.getAllLandlords(query);
    } catch (error) {
      console.error('Error in getAllLandlords controller:', error);
      throw error;
    }
  }

  @Get('admins')
  @ApiOperation({ summary: 'Get all admin users (admin only)' })
  async getAllAdmins(@Query() query: any) {
    try {
      return await this.adminService.getAllAdmins(query);
    } catch (error) {
      console.error('Error in getAllAdmins controller:', error);
      throw error;
    }
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  async getUserById(@Param('id') id: string) {
    try {
      return await this.adminService.getUserById(id);
    } catch (error) {
      console.error('Error in getUserById controller:', error);
      throw error;
    }
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user (admin only)' })
  async updateUser(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.adminService.updateUser(id, body);
    } catch (error) {
      console.error('Error in updateUser controller:', error);
      throw error;
    }
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  async deleteUser(@Param('id') id: string) {
    try {
      return await this.adminService.deleteUser(id);
    } catch (error) {
      console.error('Error in deleteUser controller:', error);
      throw error;
    }
  }
}








