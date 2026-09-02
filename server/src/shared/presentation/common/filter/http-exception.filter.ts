import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ManagedResourceNotFoundError,
  ManagedResourceScopeMismatchError,
} from '../../../application/error/managed-resource.error';
import { DomainError } from '../../../domain/domain-error';
import { getResponseRequestId } from '../util/request-id.util';
import type { HttpExceptionLogger } from './http-exception-logger';

type ErrorResponse = {
  success: false;
  error: {
    statusCode: number;
    message: string;
    path: string;
  };
  timestamp: string;
  requestId?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger?: HttpExceptionLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const statusCode = this.resolveStatusCode(exception);

    this.logFailure(exception, request, statusCode);

    response.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        message: this.resolveMessage(exception),
        path: request.originalUrl,
      },
      timestamp: new Date().toISOString(),
      requestId: getResponseRequestId(response),
    } satisfies ErrorResponse);
  }

  private logFailure(
    exception: unknown,
    request: Request,
    statusCode: number,
  ): void {
    if (!this.logger) return;

    const method = request.method || 'HTTP';
    const path = request.path || request.originalUrl.split('?')[0] || '';
    const message = `${method} ${path} failed ${statusCode}`;

    if (statusCode >= 500) {
      this.logger.error(message, this.toSafeError(exception));
      return;
    }

    this.logger.warn(message);
  }

  private toSafeError(exception: unknown): Error {
    const source = exception instanceof Error ? exception : new Error();
    const safeError = new Error('Internal server error');
    safeError.name = source.name || 'Error';

    if (source.stack) {
      const stackFrames = source.stack
        .split('\n')
        .slice(1)
        .filter((line) => /^\s*at\s/.test(line));
      safeError.stack = [
        `${safeError.name}: ${safeError.message}`,
        ...stackFrames,
      ].join('\n');
    }

    return safeError;
  }

  private resolveStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    if (
      exception instanceof ManagedResourceNotFoundError ||
      exception instanceof ManagedResourceScopeMismatchError
    ) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof DomainError) return HttpStatus.CONFLICT;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return exception instanceof DomainError ||
        exception instanceof ManagedResourceNotFoundError ||
        exception instanceof ManagedResourceScopeMismatchError
        ? exception.message
        : 'Internal server error';
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response && 'message' in response) {
      const message = response.message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }

    return exception.message;
  }
}
