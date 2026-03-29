import { Prisma } from '@prisma/client';

/** Map Prisma client errors to HTTP — used by AllExceptionsFilter when services rethrow raw errors */
export function mapPrismaClientError(exception: unknown): {
  status: number;
  message: string;
  prismaCode: string;
} | null {
  if (exception instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      message: 'Invalid request data',
      prismaCode: 'VALIDATION',
    };
  }

  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      message: 'Database client failed to initialize',
      prismaCode: 'INIT',
    };
  }

  if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      status: 503,
      message: 'Database request failed',
      prismaCode: 'UNKNOWN',
    };
  }

  if (exception instanceof Prisma.PrismaClientRustPanicError) {
    return {
      status: 503,
      message: 'Database engine error',
      prismaCode: 'RUST_PANIC',
    };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    const code = exception.code;
    switch (code) {
      case 'P2002':
        return {
          status: 409,
          message: 'A record with this value already exists',
          prismaCode: code,
        };
      case 'P2003':
        return {
          status: 400,
          message: 'Invalid reference (for example category or related record)',
          prismaCode: code,
        };
      case 'P2021':
      case 'P2022':
        return {
          status: 503,
          message:
            'Database schema is out of date. Deploy migrations (e.g. prisma migrate deploy) for this environment.',
          prismaCode: code,
        };
      case 'P1001':
      case 'P1002':
      case 'P1008':
      case 'P1011':
      case 'P1017':
        return {
          status: 503,
          message: 'Database is temporarily unavailable',
          prismaCode: code,
        };
      default:
        if (code.startsWith('P')) {
          return {
            status: 500,
            message: 'Database error',
            prismaCode: code,
          };
        }
    }
  }

  return null;
}
