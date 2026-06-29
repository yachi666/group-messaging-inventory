import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RepositoryError } from '@gmi/db';
import { ZodError } from 'zod';

@Catch(ZodError, RepositoryError, HttpException)
export class StandardErrorFilter implements ExceptionFilter {
  catch(exception: ZodError | RepositoryError | HttpException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<{ requestId?: string }>();
    const response = http.getResponse();
    const requestId = request.requestId ?? 'unknown';
    response.setHeader('x-request-id', requestId);

    if (exception instanceof RepositoryError) {
      response.status(toHttpStatus(exception)).json({
        error: {
          requestId,
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const errorBody =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as Record<string, unknown>)
          : {};

      response.status(exception.getStatus()).json({
        error: {
          requestId,
          code: String(errorBody.code ?? toHttpExceptionCode(exception)),
          message: String(errorBody.message ?? exception.message),
          details: errorBody.details,
        },
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      error: {
        requestId,
        code: 'schema_validation_failed',
        message: 'Request payload failed schema validation.',
        details: {
          issues: exception.issues,
        },
      },
    });
  }
}

function toHttpExceptionCode(exception: HttpException) {
  if (exception.getStatus() === HttpStatus.FORBIDDEN) {
    return 'access_denied';
  }

  return 'http_error';
}

function toHttpStatus(error: RepositoryError) {
  if (error.code === 'access_denied') {
    return HttpStatus.FORBIDDEN;
  }

  if (
    error.code === 'open_change_request_exists' ||
    error.code === 'base_revision_conflict' ||
    error.code === 'invalid_idempotency_key'
  ) {
    return HttpStatus.CONFLICT;
  }

  return HttpStatus.UNPROCESSABLE_ENTITY;
}
