import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { logger } from '../utils/logger';

/**
 * Logging interceptor
 * Logs request/response details with timing information
 * Note: RequestLoggerMiddleware handles initial request logging
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || 'Unknown';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;
          
          // Only log if status code indicates an error or in development
          if (statusCode >= 400 || process.env.NODE_ENV === 'development') {
            logger.log(`${method} ${originalUrl} ${statusCode} - ${delay}ms`, {
              ip,
              userAgent,
              statusCode,
              duration: `${delay}ms`,
            });
          }
        },
        error: (error) => {
          const delay = Date.now() - now;
          logger.error(`${method} ${originalUrl} - Error after ${delay}ms`, {
            ip,
            userAgent,
            error: error.message,
            stack: error.stack,
          });
        },
      }),
    );
  }
}
































