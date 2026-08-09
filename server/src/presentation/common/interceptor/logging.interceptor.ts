import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestWithId } from '../type/request-with-id.type';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<{ statusCode: number }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, response.statusCode, startedAt);
        },
        error: (error: unknown) => {
          const statusCode =
            error instanceof HttpException ? error.getStatus() : 500;
          this.logRequest(request, statusCode, startedAt);
        },
      }),
    );
  }

  private logRequest(
    request: RequestWithId,
    statusCode: number,
    startedAt: number,
  ): void {
    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `${request.method} ${request.originalUrl} ${statusCode} ${durationMs}ms requestId=${request.requestId ?? '-'}`,
    );
  }
}
