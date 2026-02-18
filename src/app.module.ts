import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/cache.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ListingsModule } from './listings/listings.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';
import { UploadModule } from './upload/upload.module';
import { ProfileModule } from './profile/profile.module';
import { AdminModule } from './admin/admin.module';
import { SocketModule } from './socket/socket.module';
import { ChatModule } from './chat/chat.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { validateEnv } from './config/env.validation';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    
    // Rate limiting - Multiple strategies for different endpoint types
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000, // 60 seconds
        limit: parseInt(process.env.THROTTLE_LIMIT || '100'), // 100 requests per minute
      },
      {
        name: 'auth',
        ttl: 60 * 1000, // 60 seconds
        limit: 10, // 10 requests per minute for auth endpoints (not too strict)
      },
      {
        name: 'strict',
        ttl: 60 * 60 * 1000, // 1 hour
        limit: 5, // 5 requests per hour for very sensitive operations
      },
    ]),
    
    // Database
    DatabaseModule,
    
    // Cache
    CacheModule,
    
    // Logger
    LoggerModule,
    
    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    FavoritesModule,
    ReviewsModule,
    SearchModule,
    UploadModule,
    ProfileModule,
    AdminModule,
    SocketModule,
    ChatModule,
    SavedSearchesModule,
    SearchHistoryModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply request logging middleware to all routes
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}

