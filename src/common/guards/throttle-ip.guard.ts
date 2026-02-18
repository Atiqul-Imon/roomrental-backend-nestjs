import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Custom throttle guard that uses IP address for rate limiting
 * Falls back to user ID if authenticated
 */
@Injectable()
export class ThrottleIpGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;
    // Use user ID if authenticated, otherwise use IP address
    const userId = (request as any).user?.sub || (request as any).user?.id;
    return userId || request.ip || request.socket.remoteAddress || 'unknown';
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}

