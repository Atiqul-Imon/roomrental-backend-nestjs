import { Module, forwardRef } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { DatabaseModule } from '../database/database.module';
import { SearchHistoryModule } from '../search-history/search-history.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => SearchHistoryModule)],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}












