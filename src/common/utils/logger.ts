/**
 * Winston-based logger utility for backend services
 * Provides structured logging with Winston
 * 
 * Usage:
 *   import { logger } from '@/common/utils/logger';
 *   logger.log('Message', data);
 *   logger.error('Error message', error);
 */

import * as winston from 'winston';

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

const winstonLogger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * Logger utility with Winston backend
 * Maintains backward compatibility with existing code
 */
class Logger {
  log(message: string, data?: unknown): void {
    if (data) {
      winstonLogger.info(message, data);
    } else {
      winstonLogger.info(message);
    }
  }

  error(message: string, error?: unknown): void {
    if (error) {
      winstonLogger.error(message, { error });
    } else {
      winstonLogger.error(message);
    }
  }

  warn(message: string, data?: unknown): void {
    if (data) {
      winstonLogger.warn(message, data);
    } else {
      winstonLogger.warn(message);
    }
  }

  debug(message: string, data?: unknown): void {
    if (data) {
      winstonLogger.debug(message, data);
    } else {
      winstonLogger.debug(message);
    }
  }
}

export const logger = new Logger();


