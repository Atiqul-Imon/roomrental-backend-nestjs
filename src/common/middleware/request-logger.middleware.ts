import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Request logging middleware
 * Logs all incoming HTTP requests with method, path, IP, and user agent
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'Unknown';
    const startTime = Date.now();

    // Log incoming request
    logger.log(`Incoming ${method} ${originalUrl}`, {
      ip,
      userAgent,
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      
      logger.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, {
        ip,
        statusCode,
        duration: `${duration}ms`,
      });
    });

    next();
  }
}

