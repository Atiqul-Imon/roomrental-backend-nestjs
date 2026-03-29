import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { mapPrismaClientError } from '../utils/prisma-error.mapper';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // express/body-parser: payload too large (default was 100kb; blog JSON can exceed it)
    const ext = exception as { type?: string; status?: number; statusCode?: number };
    let entityTooLarge = false;
    if (ext?.type === 'entity.too.large') {
      entityTooLarge = true;
    }

    const prismaMapped = !entityTooLarge ? mapPrismaClientError(exception) : null;

    let status: number;
    let message: string | object;

    if (entityTooLarge) {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      message =
        'Request body too large. For long articles the API allows up to BODY_JSON_LIMIT (default 10mb).';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (prismaMapped) {
      status = prismaMapped.status;
      message = prismaMapped.message;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    let messageStr =
      typeof message === 'string'
        ? message
        : Array.isArray((message as { message?: unknown }).message)
          ? ((message as { message: string[] }).message || []).join('; ')
          : (message as { message?: string }).message || 'An error occurred';

    // Prisma codes: prefer structured mapper; else raw P* on unknown errors
    let prismaCode = prismaMapped?.prismaCode;
    if (
      !prismaCode &&
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof (exception as { code: unknown }).code === 'string'
    ) {
      const c = (exception as { code: string }).code;
      if (c.startsWith('P')) prismaCode = c;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: messageStr,
      ...(prismaCode ? { prismaCode } : {}),
    };

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    response.status(status).json(errorResponse);
  }
}
































