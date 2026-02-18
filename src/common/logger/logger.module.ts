import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger.service';

/**
 * Global logger module
 * Provides AppLogger service throughout the application
 */
@Global()
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggerModule {}

