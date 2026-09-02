import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { LogLevel, Logger, logAtLevel } from '@kangjuhyup/rvlog';
import {
  RVLOG_HTTP_LOGGING_OPTIONS,
  type RvlogHttpLoggingOptions,
} from '@kangjuhyup/rvlog-nest';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

type HttpRequest = {
  method?: string;
  path?: string;
  originalUrl?: string;
  url?: string;
};

type HttpResponse = {
  statusCode?: number;
};

@Injectable()
export class RvlogHttpLoggingInterceptor implements NestInterceptor {
  private readonly logger: Logger;

  constructor(
    @Inject(RVLOG_HTTP_LOGGING_OPTIONS)
    private readonly options: RvlogHttpLoggingOptions,
  ) {
    this.logger = new Logger(options.context ?? 'HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<'http'>() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const method = request.method ?? 'HTTP';
    const path = this.getSafePath(request);

    if (this.isExcluded(path)) {
      return next.handle();
    }

    const startedAt = performance.now();
    logAtLevel(
      this.logger,
      this.options.level ?? LogLevel.INFO,
      `${method} ${path} called`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          this.logCompletion(
            method,
            path,
            response.statusCode ?? 200,
            startedAt,
          );
        },
      }),
    );
  }

  private logCompletion(
    method: string,
    path: string,
    statusCode: number,
    startedAt: number,
  ): void {
    const duration = this.getDuration(startedAt);

    if (statusCode >= 500) {
      this.logger.error(`${method} ${path} failed ${statusCode} (${duration})`);
      return;
    }

    if (statusCode >= 400) {
      this.logger.warn(`${method} ${path} failed ${statusCode} (${duration})`);
      return;
    }

    logAtLevel(
      this.logger,
      this.options.level ?? LogLevel.INFO,
      `${method} ${path} completed ${statusCode} (${duration})`,
    );
  }

  private getSafePath(request: HttpRequest): string {
    const path = request.path ?? request.originalUrl ?? request.url ?? '';
    return path.split('?')[0] ?? '';
  }

  private isExcluded(path: string): boolean {
    return (this.options.excludePaths ?? []).some(
      (excluded) => path === excluded || path.startsWith(`${excluded}/`),
    );
  }

  private getDuration(startedAt: number): string {
    return `${(performance.now() - startedAt).toFixed(2)}ms`;
  }
}
