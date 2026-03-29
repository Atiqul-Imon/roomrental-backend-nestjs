import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | object =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // express/body-parser: payload too large (default was 100kb; blog JSON can exceed it)
    const ext = exception as { type?: string; status?: number; statusCode?: number };
    if (ext?.type === 'entity.too.large') {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      message =
        'Request body too large. For long articles the API allows up to BODY_JSON_LIMIT (default 10mb).';
    }

    let messageStr =
      typeof message === 'string'
        ? message
        : Array.isArray((message as { message?: unknown }).message)
          ? ((message as { message: string[] }).message || []).join('; ')
          : (message as { message?: string }).message || 'An error occurred';

    // Surface Prisma client codes in the JSON body (logged always; helps production debugging)
    const prismaCode =
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof (exception as { code: unknown }).code === 'string' &&
      (exception as { code: string }).code.startsWith('P')
        ? (exception as { code: string }).code
        : undefined;

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
































