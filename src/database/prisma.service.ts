import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Monitor slow queries
    this.$on('query' as never, (e: any) => {
      if (e.duration > this.SLOW_QUERY_THRESHOLD) {
        this.logger.warn(
          `🐌 Slow query detected: ${e.duration}ms - ${e.query.substring(0, 200)}...`,
        );
      } else if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Query: ${e.duration}ms - ${e.query.substring(0, 100)}...`);
      }
    });

    // Log errors
    this.$on('error' as never, (e: any) => {
      this.logger.error('Database error:', e);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
































