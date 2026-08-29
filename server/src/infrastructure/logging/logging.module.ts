import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Logger } from '@kangjuhyup/rvlog';
import {
  RVLOG_HTTP_LOGGER_SYSTEM,
  RVLOG_HTTP_LOGGING_OPTIONS,
  RvlogRequestContextMiddleware,
} from '@kangjuhyup/rvlog-nest';
import { createRvlogLoggerOptions, RVLOG_HTTP_OPTIONS } from './rvlog.options';
import { RvlogHttpLoggingInterceptor } from './rvlog-http-logging.interceptor';

Logger.configure(createRvlogLoggerOptions());

@Module({
  providers: [
    {
      provide: RVLOG_HTTP_LOGGING_OPTIONS,
      useValue: RVLOG_HTTP_OPTIONS,
    },
    {
      provide: RVLOG_HTTP_LOGGER_SYSTEM,
      useValue: null,
    },
    RvlogRequestContextMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: RvlogHttpLoggingInterceptor,
    },
  ],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RvlogRequestContextMiddleware).forRoutes('*');
  }
}
