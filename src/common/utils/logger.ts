/**
 * Simple logger utility for backend services
 * Replaces console.log/error with structured logging
 * 
 * Usage:
 *   import { logger } from '@/common/utils/logger';
 *   logger.log('Message');
 *   logger.error('Error message', error);
 */

type LogLevel = 'log' | 'error' | 'warn' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  log(message: string, data?: unknown): void {
    const formatted = this.formatMessage('log', message, data);
    console.log(formatted);
  }

  error(message: string, error?: unknown): void {
    const formatted = this.formatMessage('error', message, error);
    console.error(formatted);
  }

  warn(message: string, data?: unknown): void {
    const formatted = this.formatMessage('warn', message, data);
    console.warn(formatted);
  }

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, data);
      console.debug(formatted);
    }
  }
}

export const logger = new Logger();


