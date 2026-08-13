import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithId } from '../type/request-with-id.type';

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
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        message: this.resolveMessage(exception),
        path: request.originalUrl,
      },
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    } satisfies ErrorResponse);
  }

  private resolveMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = response.message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }

    return exception.message;
  }
}
