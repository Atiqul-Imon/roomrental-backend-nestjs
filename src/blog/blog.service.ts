import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BlogPostStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import slugify from 'slugify';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { QueryPublicBlogDto } from './dto/query-public-blog.dto';
import { QueryAdminBlogDto } from './dto/query-admin-blog.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import {
  BlogContentRenderError,
  estimateReadingMinutesFromHtml,
  jsonToSanitizedHtml,
  normalizeContentJson,
} from './blog-html.util';
import { createHash } from 'crypto';

const CACHE_NS = 'blog:v1';
const TTL_POST = 300;
const TTL_LIST = 120;

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async bumpBlogCache() {
    await this.cache.invalidatePattern(`${CACHE_NS}:*`);
  }

  /** Featured filter: DTO normalizes query strings; keep tolerant for tests or non-piped callers */
  private isFeaturedOnlyQuery(q: QueryPublicBlogDto): boolean {
    const f = q.featured as unknown;
    return (
      q.featured === 1 ||
      f === true ||
      f === '1' ||
      (typeof f === 'string' && f.trim() === '1')
    );
  }

  private listCacheKey(q: QueryPublicBlogDto): string {
    const payload = JSON.stringify({
      p: q.page ?? 1,
      l: q.limit ?? 12,
      c: q.category ?? '',
      t: q.tag ?? '',
      s: q.search ?? '',
      f: this.isFeaturedOnlyQuery(q) ? 1 : 0,
    });
    const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
    return `${CACHE_NS}:list:${hash}`;
  }

  private publicVisibilityWhere(now: Date): Prisma.BlogPostWhereInput {
    return {
      OR: [
        {
          status: BlogPostStatus.published,
          publishedAt: { lte: now },
        },
        {
          status: BlogPostStatus.scheduled,
          scheduledFor: { lte: now },
        },
      ],
    };
  }

  private async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base || 'post';
    let n = 0;
    while (true) {
      const candidate = n === 0 ? slug : `${slug}-${n}`;
      const existing = await this.prisma.blogPost.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!existing) return candidate;
      n += 1;
      if (n > 50) throw new ConflictException('Unable to allocate unique slug');
    }
  }

  private normalizeTagSlug(name: string): string {
    const s = slugify(name.trim(), { lower: true, strict: true, trim: true });
    return s || 'tag';
  }

  async syncPostTags(postId: string, tagNames: string[] | undefined) {
    if (!tagNames) return;
    const unique = [
      ...new Set(
        tagNames
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ];
    if (unique.length === 0) {
      await this.prisma.blogPost.update({
        where: { id: postId },
        data: { tags: { set: [] } },
      });
      return;
    }
    const tagIds: string[] = [];
    for (const name of unique) {
      const slug = this.normalizeTagSlug(name);
      const tag = await this.prisma.blogTag.upsert({
        where: { slug },
        create: { name: name.slice(0, 80), slug },
        update: { name: name.slice(0, 80) },
      });
      tagIds.push(tag.id);
    }
    await this.prisma.blogPost.update({
      where: { id: postId },
      data: {
        tags: { set: tagIds.map((id) => ({ id })) },
      },
    });
  }

  // --- Public ---

  async findPublishedPosts(query: QueryPublicBlogDto) {
    const cacheKey = this.listCacheKey(query);
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {
      AND: [
        this.publicVisibilityWhere(now),
        ...(this.isFeaturedOnlyQuery(query) ? [{ isFeatured: true }] : []),
        ...(query.category
          ? [{ category: { slug: query.category } }]
          : []),
        ...(query.tag
          ? [{ tags: { some: { slug: query.tag } } }]
          : []),
        ...(query.search
          ? [
              {
                OR: [
                  {
                    title: {
                      contains: query.search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                  {
                    excerpt: {
                      contains: query.search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { publishedAt: { sort: 'desc', nulls: 'last' } },
          { scheduledFor: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          status: true,
          publishedAt: true,
          scheduledFor: true,
          coverImageUrl: true,
          readingTimeMinutes: true,
          isFeatured: true,
          createdAt: true,
          updatedAt: true,
          metaTitle: true,
          metaDescription: true,
          author: { select: { id: true, name: true, profileImage: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: { select: { name: true, slug: true } },
        },
      }),
    ]);

    const result = {
      success: true,
      data: {
        posts: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    };

    await this.cache.set(cacheKey, result, TTL_LIST);
    return result;
  }

  async findPublishedBySlug(slug: string) {
    const normalized = (slug ?? '').trim();
    if (!normalized) throw new NotFoundException('Post not found');
    slug = normalized;
    const cacheKey = `${CACHE_NS}:post:${slug}`;
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, AND: [this.publicVisibilityWhere(now)] },
      include: {
        author: { select: { id: true, name: true, profileImage: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { name: true, slug: true } },
      },
    });

    if (!post) throw new NotFoundException('Post not found');

    await this.prisma.blogPost
      .update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => undefined);

    const { contentJson: _cj, ...rest } = post;
    const payload = { success: true, data: { post: rest } };
    await this.cache.set(cacheKey, payload, TTL_POST);
    return payload;
  }

  async listPublicCategories() {
    const cacheKey = `${CACHE_NS}:categories`;
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { posts: true } },
      },
    });

    const result = { success: true, data: { categories } };
    await this.cache.set(cacheKey, result, TTL_LIST);
    return result;
  }

  // --- Admin ---

  async adminListPosts(query: QueryAdminBlogDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              { slug: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [total, posts] = await this.prisma.$transaction([
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, email: true } },
          category: true,
          tags: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    };
  }

  async adminGetPost(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: true,
        tags: true,
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return { success: true, data: { post } };
  }

  private mapPrismaFkToBadRequest(e: unknown): void {
    if (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'P2003'
    ) {
      throw new BadRequestException('Invalid category or related reference');
    }
  }

  async adminCreatePost(dto: CreateBlogPostDto, authorId: string) {
    const doc = normalizeContentJson(dto.contentJson);
    let contentHtml: string;
    try {
      contentHtml = jsonToSanitizedHtml(doc);
    } catch (err) {
      if (err instanceof BlogContentRenderError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
    const readingTimeMinutes = estimateReadingMinutesFromHtml(contentHtml);

    let baseSlug = dto.slug?.trim()
      ? slugify(dto.slug.trim(), { lower: true, strict: true })
      : slugify(dto.title, { lower: true, strict: true });
    baseSlug = await this.ensureUniqueSlug(baseSlug || 'post');

    const publishedAt =
      dto.publishedAt != null
        ? new Date(dto.publishedAt)
        : dto.status === BlogPostStatus.published
          ? new Date()
          : null;

    if (dto.status === BlogPostStatus.scheduled && !dto.scheduledFor) {
      throw new BadRequestException('scheduledFor is required when status is scheduled');
    }
    const scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null;

    let post;
    try {
      post = await this.prisma.blogPost.create({
        data: {
          title: dto.title.trim(),
          slug: baseSlug,
          excerpt: dto.excerpt?.trim() || null,
          contentJson: doc as unknown as Prisma.InputJsonValue,
          contentHtml,
          status: dto.status,
          publishedAt,
          scheduledFor,
          authorId,
          categoryId: dto.categoryId ?? null,
          coverImageUrl: dto.coverImageUrl ?? null,
          readingTimeMinutes,
          metaTitle: dto.metaTitle?.trim() || null,
          metaDescription: dto.metaDescription?.trim() || null,
          canonicalUrl: dto.canonicalUrl?.trim() || null,
          ogImageUrl: dto.ogImageUrl?.trim() || null,
          focusKeyword: dto.focusKeyword?.trim() || null,
          keywords: dto.keywords?.length ? dto.keywords : [],
          robotsIndex: dto.robotsIndex ?? true,
          robotsFollow: dto.robotsFollow ?? true,
          isFeatured: dto.isFeatured ?? false,
        },
      });
    } catch (e) {
      this.mapPrismaFkToBadRequest(e);
      throw e;
    }

    await this.syncPostTags(post.id, dto.tags);
    await this.bumpBlogCache();

    return this.adminGetPost(post.id);
  }

  async adminUpdatePost(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');

    let contentJson = existing.contentJson;
    let contentHtml = existing.contentHtml;
    let readingTimeMinutes = existing.readingTimeMinutes;

    if (dto.contentJson !== undefined) {
      const doc = normalizeContentJson(dto.contentJson);
      contentJson = doc as unknown as Prisma.JsonValue;
      try {
        contentHtml = jsonToSanitizedHtml(doc);
      } catch (err) {
        if (err instanceof BlogContentRenderError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
      readingTimeMinutes = estimateReadingMinutesFromHtml(contentHtml);
    }

    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug.trim()) {
      slug = await this.ensureUniqueSlug(
        slugify(dto.slug.trim(), { lower: true, strict: true }),
        id,
      );
    }

    const nextStatus = dto.status ?? existing.status;
    let publishedAt = existing.publishedAt;
    let scheduledFor = existing.scheduledFor;

    if (dto.publishedAt !== undefined) {
      publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    }
    if (dto.scheduledFor !== undefined) {
      scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    }

    if (nextStatus === BlogPostStatus.published && !publishedAt) {
      publishedAt = new Date();
    }
    if (nextStatus === BlogPostStatus.scheduled && !scheduledFor) {
      throw new BadRequestException('scheduledFor is required when status is scheduled');
    }

    const categoryPatch =
      dto.categoryId !== undefined
        ? {
            categoryId:
              dto.categoryId === null ||
              (typeof dto.categoryId === 'string' && dto.categoryId.trim() === '')
                ? null
                : dto.categoryId,
          }
        : {};

    let updated;
    try {
      updated = await this.prisma.blogPost.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          slug,
          ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt?.trim() || null } : {}),
          contentJson: contentJson as Prisma.InputJsonValue,
          contentHtml,
          readingTimeMinutes,
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          publishedAt,
          scheduledFor,
          ...categoryPatch,
          ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
          ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle?.trim() || null } : {}),
          ...(dto.metaDescription !== undefined
            ? { metaDescription: dto.metaDescription?.trim() || null }
            : {}),
          ...(dto.canonicalUrl !== undefined ? { canonicalUrl: dto.canonicalUrl?.trim() || null } : {}),
          ...(dto.ogImageUrl !== undefined ? { ogImageUrl: dto.ogImageUrl?.trim() || null } : {}),
          ...(dto.focusKeyword !== undefined ? { focusKeyword: dto.focusKeyword?.trim() || null } : {}),
          ...(dto.keywords !== undefined ? { keywords: dto.keywords } : {}),
          ...(dto.robotsIndex !== undefined ? { robotsIndex: dto.robotsIndex } : {}),
          ...(dto.robotsFollow !== undefined ? { robotsFollow: dto.robotsFollow } : {}),
          ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        },
      });
    } catch (e) {
      this.mapPrismaFkToBadRequest(e);
      throw e;
    }

    if (dto.tags !== undefined) {
      await this.syncPostTags(id, dto.tags);
    }

    await this.bumpBlogCache();
    if (existing.slug !== updated.slug) {
      await this.cache.del(`${CACHE_NS}:post:${existing.slug}`);
    }

    return this.adminGetPost(id);
  }

  async adminDeletePost(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');
    await this.prisma.blogPost.delete({ where: { id } });
    await this.bumpBlogCache();
    await this.cache.del(`${CACHE_NS}:post:${existing.slug}`);
    return { success: true, data: { deleted: true } };
  }

  // Categories admin + used by editor

  async adminListCategories() {
    const categories = await this.prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    return { success: true, data: { categories } };
  }

  async adminCreateCategory(dto: CreateBlogCategoryDto) {
    const base =
      dto.slug?.trim()
        ? slugify(dto.slug.trim(), { lower: true, strict: true })
        : slugify(dto.name, { lower: true, strict: true });
    const slug = await this.ensureCategorySlug(base || 'category');
    const cat = await this.prisma.blogCategory.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
      },
    });
    await this.bumpBlogCache();
    return { success: true, data: { category: cat } };
  }

  private async ensureCategorySlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let n = 0;
    while (true) {
      const candidate = n === 0 ? slug : `${slug}-${n}`;
      const exists = await this.prisma.blogCategory.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (!exists) return candidate;
      n += 1;
    }
  }

  async adminUpdateCategory(id: string, dto: UpdateBlogCategoryDto) {
    const existing = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    const data: Prisma.BlogCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.slug !== undefined && dto.slug.trim()) {
      data.slug = await this.ensureCategorySlug(
        slugify(dto.slug.trim(), { lower: true, strict: true }),
        id,
      );
    }
    if (Object.keys(data).length === 0) {
      return { success: true, data: { category: existing } };
    }
    const cat = await this.prisma.blogCategory.update({ where: { id }, data });
    await this.bumpBlogCache();
    return { success: true, data: { category: cat } };
  }

  async adminDeleteCategory(id: string) {
    try {
      await this.prisma.blogCategory.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Category not found');
    }
    await this.bumpBlogCache();
    return { success: true, data: { deleted: true } };
  }
}
