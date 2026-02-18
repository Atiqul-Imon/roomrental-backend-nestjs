import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

/**
 * Winston-based structured logger service
 * Provides structured JSON logs in production and pretty logs in development
 */
@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    );

    // Pretty format for development
    const prettyFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length
          ? `\n${JSON.stringify(meta, null, 2)}`
          : '';
        return `${timestamp} [${level}]: ${message}${metaString}`;
      }),
    );

    // Create transports
    const transports: winston.transport[] = [
      // Console transport - always enabled
      new winston.transports.Console({
        format: isDevelopment ? prettyFormat : logFormat,
        level: isDevelopment ? 'debug' : 'info',
      }),
    ];

    // File transport for production errors
    if (isProduction) {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );
    }

    this.logger = winston.createLogger({
      level: isDevelopment ? 'debug' : 'info',
      format: logFormat,
      transports,
      // Don't exit on handled exceptions
      exitOnError: false,
    });
  }

  /**
   * Log a message with info level
   */
  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, { context, ...meta });
  }

  /**
   * Log an error message
   */
  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, {
      trace,
      context,
      ...meta,
    });
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, { context, ...meta });
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, { context, ...meta });
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.verbose(message, { context, ...meta });
  }

  /**
   * Get the underlying Winston logger for advanced usage
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

