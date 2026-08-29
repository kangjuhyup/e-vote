import { LogLevel, type LoggerOptions } from '@kangjuhyup/rvlog';
import type { RvlogHttpLoggingOptions } from '@kangjuhyup/rvlog-nest';

export function createRvlogLoggerOptions(
  environment = process.env.NODE_ENV,
): LoggerOptions {
  const isProduction = environment === 'production';

  return {
    minLevel: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
    pretty: !isProduction,
    serialize: {
      maxStringLength: 256,
      maxArrayLength: 20,
      maxObjectKeys: 30,
      maxDepth: 4,
      truncateSuffix: '...<truncated>',
    },
  };
}

export const RVLOG_HTTP_OPTIONS: RvlogHttpLoggingOptions = {
  context: 'HTTP',
  level: LogLevel.INFO,
  logBody: false,
  logQuery: false,
  logParams: false,
  logHeaders: false,
  logResponseBody: false,
  excludePaths: ['/liveness'],
  requestIdHeader: 'x-request-id',
  setResponseHeader: true,
};
