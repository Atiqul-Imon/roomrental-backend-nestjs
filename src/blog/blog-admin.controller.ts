import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { QueryAdminBlogDto } from './dto/query-admin-blog.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';

@ApiTags('Blog (admin)')
@Controller('admin/blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin', 'staff')
@ApiBearerAuth()
export class BlogAdminController {
  constructor(private readonly blogService: BlogService) {}

  @Get('posts')
  @ApiOperation({ summary: 'List posts (all statuses)' })
  adminList(@Query() query: QueryAdminBlogDto) {
    return this.blogService.adminListPosts(query);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get post for editing' })
  adminGet(@Param('id') id: string) {
    return this.blogService.adminGetPost(id);
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create post' })
  adminCreate(
    @Body() dto: CreateBlogPostDto,
    @CurrentUser() user: { id: string; email: string; name?: string | null },
  ) {
    return this.blogService.adminCreatePost(dto, user.id, {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
    });
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Update post' })
  adminUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
    @CurrentUser() user: { id: string; email: string; name?: string | null },
  ) {
    return this.blogService.adminUpdatePost(id, dto, {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
    });
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete post' })
  adminDelete(@Param('id') id: string) {
    return this.blogService.adminDeletePost(id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  adminCategories() {
    return this.blogService.adminListCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  adminCreateCategory(@Body() dto: CreateBlogCategoryDto) {
    return this.blogService.adminCreateCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  adminUpdateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateBlogCategoryDto,
  ) {
    return this.blogService.adminUpdateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete category' })
  adminDeleteCategory(@Param('id') id: string) {
    return this.blogService.adminDeleteCategory(id);
  }
}
