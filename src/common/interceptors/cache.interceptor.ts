import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;

    // Only set cache headers for GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    // Determine cache strategy based on route
    let cacheControl: string;
    let maxAge: number;
    let sMaxAge: number;

    // Static data - long cache (1 hour)
    if (
      url.includes('/amenities') ||
      url.includes('/categories') ||
      url.includes('/locations')
    ) {
      maxAge = 3600; // 1 hour
      sMaxAge = 7200; // 2 hours (CDN)
      cacheControl = `public, max-age=${maxAge}, s-maxage=${sMaxAge}`;
    }
    // Listings list - medium cache (5 minutes)
    else if (url.match(/^\/api\/listings(\?|$)/) && !url.includes('/listings/')) {
      maxAge = 300; // 5 minutes
      sMaxAge = 600; // 10 minutes (CDN)
      cacheControl = `public, max-age=${maxAge}, s-maxage=${sMaxAge}`;
    }
    // Listing detail - short cache (2 minutes)
    else if (url.match(/^\/api\/listings\/[^/]+$/)) {
      maxAge = 120; // 2 minutes
      sMaxAge = 300; // 5 minutes (CDN)
      cacheControl = `public, max-age=${maxAge}, s-maxage=${sMaxAge}`;
    }
    // User profile - medium cache (10 minutes, private)
    else if (url.match(/^\/api\/users\/[^/]+$/)) {
      maxAge = 600; // 10 minutes
      cacheControl = `private, max-age=${maxAge}`;
    }
    // Reviews - short cache (2 minutes)
    else if (url.includes('/reviews')) {
      maxAge = 120; // 2 minutes
      sMaxAge = 300; // 5 minutes (CDN)
      cacheControl = `public, max-age=${maxAge}, s-maxage=${sMaxAge}`;
    }
    // Search results - short cache (1 minute)
    else if (url.includes('/search')) {
      maxAge = 60; // 1 minute
      sMaxAge = 120; // 2 minutes (CDN)
      cacheControl = `public, max-age=${maxAge}, s-maxage=${sMaxAge}`;
    }
    // Health check - no cache
    else if (url.includes('/health')) {
      cacheControl = 'no-cache, no-store, must-revalidate';
    }
    // Default - short cache (1 minute)
    else {
      maxAge = 60; // 1 minute
      sMaxAge = 120; // 2 minutes (CDN)
      cacheControl = `public, max-age=${maxAge}, s-maxage=${sMaxAge}`;
    }

    return next.handle().pipe(
      tap(() => {
        // Set cache control header
        response.setHeader('Cache-Control', cacheControl);
        
        // Set ETag header for conditional requests
        // This will be set by NestJS automatically if using ETag support
        
        // Set Vary header for proper cache key generation
        if (url.includes('/listings') || url.includes('/search')) {
          response.setHeader('Vary', 'Accept, Accept-Encoding');
        }
      }),
    );
  }
}

