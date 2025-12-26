import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
      },
    ]),
    
    // Database
    DatabaseModule,
    
    // Cache
    CacheModule,
    
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
export class AppModule {}

