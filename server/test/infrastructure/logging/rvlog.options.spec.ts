import { LogLevel } from '@kangjuhyup/rvlog';
import {
  createRvlogLoggerOptions,
  RVLOG_HTTP_OPTIONS,
} from '../../../src/platform/logging/rvlog.options';

describe('rvlog options', () => {
  it('uses structured info logs in production', () => {
    expect(createRvlogLoggerOptions('production')).toMatchObject({
      minLevel: LogLevel.INFO,
      pretty: false,
    });
  });

  it('uses readable debug logs outside production', () => {
    expect(createRvlogLoggerOptions('development')).toMatchObject({
      minLevel: LogLevel.DEBUG,
      pretty: true,
    });
  });

  it('does not log vote, identity, or credential payloads', () => {
    expect(RVLOG_HTTP_OPTIONS).toMatchObject({
      logBody: false,
      logQuery: false,
      logParams: false,
      logHeaders: false,
      logResponseBody: false,
      requestIdHeader: 'x-request-id',
      setResponseHeader: true,
    });
  });
});
