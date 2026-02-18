import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumberString,
  IsUrl,
  IsEmail,
  ValidateIf,
  validateSync,
} from 'class-validator';

/**
 * Environment variables validation schema
 * Validates critical environment variables on application startup
 */
class EnvironmentVariables {
  // Critical - Required
  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL is required' })
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET is required' })
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty({ message: 'JWT_REFRESH_SECRET is required' })
  JWT_REFRESH_SECRET!: string;

  // Important - With defaults but validated
  @IsOptional()
  @IsIn(['development', 'production', 'test'], {
    message: 'NODE_ENV must be one of: development, production, test',
  })
  NODE_ENV?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'PORT must be a valid number' })
  PORT?: string;

  @IsOptional()
  @IsString({ message: 'FRONTEND_URL must be a string if provided' })
  FRONTEND_URL?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRE?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRE?: string;

  // Optional but validated if provided
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @ValidateIf((o) => o.SUPABASE_URL !== undefined)
  @IsUrl({}, { message: 'SUPABASE_URL must be a valid URL if provided' })
  SUPABASE_URL?: string;

  @ValidateIf((o) => o.SUPABASE_SERVICE_ROLE_KEY !== undefined)
  @IsString()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @IsOptional()
  @IsEmail({}, { message: 'RESEND_FROM_EMAIL must be a valid email address if provided' })
  RESEND_FROM_EMAIL?: string;

  @IsOptional()
  @IsString()
  RESEND_FROM_NAME?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'THROTTLE_TTL must be a valid number if provided' })
  THROTTLE_TTL?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'THROTTLE_LIMIT must be a valid number if provided' })
  THROTTLE_LIMIT?: string;

  // Redis configuration (optional)
  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @ValidateIf((o) => o.REDIS_PORT !== undefined)
  @IsNumberString({}, { message: 'REDIS_PORT must be a valid number if provided' })
  REDIS_PORT?: string;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;
}

/**
 * Validates environment variables using class-validator
 * Throws an error with clear messages if validation fails
 */
export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false, // Allow unknown properties (system env vars, etc.)
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'Invalid value';
        return `  - ${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `❌ Environment variable validation failed:\n${errorMessages}\n\nPlease check your .env file and ensure all required variables are set.`,
    );
  }

  return validatedConfig;
}

