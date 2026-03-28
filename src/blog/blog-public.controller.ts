import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { QueryPublicBlogDto } from './dto/query-public-blog.dto';

@ApiTags('Blog (public)')
@Controller('blog')
export class BlogPublicController {
  constructor(private readonly blogService: BlogService) {}

  @Get('posts')
  @ApiOperation({ summary: 'List published blog posts' })
  findPosts(@Query() query: QueryPublicBlogDto) {
    return this.blogService.findPublishedPosts(query);
  }

  @Get('posts/:slug')
  @ApiOperation({ summary: 'Get a published post by slug' })
  findPostBySlug(@Param('slug') slug: string) {
    return this.blogService.findPublishedBySlug(slug);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List blog categories' })
  listCategories() {
    return this.blogService.listPublicCategories();
  }
}
