/**
 * Type-safe environment configuration interface
 * Use this with ConfigService for type-safe access to environment variables
 * 
 * Usage:
 *   constructor(private configService: ConfigService<EnvironmentConfig>) {}
 *   const dbUrl = this.configService.get<string>('DATABASE_URL');
 */
export interface EnvironmentConfig {
  // Critical - Required
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;

  // Important - With defaults
  NODE_ENV?: 'development' | 'production' | 'test';
  PORT?: string;
  FRONTEND_URL?: string;
  JWT_EXPIRE?: string;
  JWT_REFRESH_EXPIRE?: string;

  // Optional
  CORS_ORIGIN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_FROM_NAME?: string;
  THROTTLE_TTL?: string;
  THROTTLE_LIMIT?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  REDIS_URL?: string;
}


