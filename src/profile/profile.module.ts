import { Module, forwardRef } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { CacheModule } from '../cache/cache.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CacheModule, forwardRef(() => AuthModule)],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
































