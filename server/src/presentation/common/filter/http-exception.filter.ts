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
} from '../../../application/command/vote-management.error';
import { DomainError } from '../../../domain/shared/domain-error';
import { getResponseRequestId } from '../util/request-id.util';

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
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const statusCode = this.resolveStatusCode(exception);

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
