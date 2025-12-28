import { Module } from '@nestjs/common';
import { SavedSearchesService } from './saved-searches.service';
import { SavedSearchesController } from './saved-searches.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SavedSearchesController],
  providers: [SavedSearchesService],
  exports: [SavedSearchesService],
})
export class SavedSearchesModule {}






