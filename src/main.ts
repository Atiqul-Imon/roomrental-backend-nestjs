import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { logger } from './common/utils/logger';
import { AppLogger } from './common/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable default NestJS logger, we'll use our own
  });
  
  // Use Winston logger for NestJS
  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);
  
  // Response compression (30-50% smaller responses)
  app.use(compression({
    level: 6, // Balance between speed and compression (1-9)
    threshold: 1024, // Only compress responses > 1KB
  }));
  
  // CORS - Get origins before helmet configuration
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];
  
  // Security headers with Helmet
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
          scriptSrc: ["'self'"], // Swagger UI scripts
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...corsOrigins],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null, // Only in production
        },
      },
      // HTTP Strict Transport Security (HSTS)
      hsts: isProduction
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false, // Disable in development
      // X-Frame-Options
      frameguard: {
        action: 'deny',
      },
      // X-Content-Type-Options
      noSniff: true,
      // X-XSS-Protection
      xssFilter: true,
      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: false, // Disable for API compatibility
    }),
  );
  
  logger.log('🌐 CORS Origins', corsOrigins);
  
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  });
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Global interceptors
  app.useGlobalInterceptors(
    new CacheInterceptor(), // Cache headers - must be first
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );
  
  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('RoomRentalUSA API')
      .setDescription('Room Rental Platform API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }
  
  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0'); // Listen on all interfaces for production
  
  logger.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
  }
}

bootstrap();



