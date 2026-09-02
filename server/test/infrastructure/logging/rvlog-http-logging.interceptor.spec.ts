import { ExecutionContext, HttpException } from '@nestjs/common';
import { Logger, LogLevel } from '@kangjuhyup/rvlog';
import { firstValueFrom, of, throwError } from 'rxjs';
import { RvlogHttpLoggingInterceptor } from '../../../src/platform/logging/rvlog-http-logging.interceptor';

function createHttpContext(statusCode = 200): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        path: '/participations',
        originalUrl: '/participations?identityToken=secret-token',
      }),
      getResponse: () => ({ statusCode }),
    }),
  } as ExecutionContext;
}

describe('RvlogHttpLoggingInterceptor', () => {
  afterEach(() => {
    Logger.resetForTesting();
    jest.restoreAllMocks();
  });

  it('logs method, safe path, status, and duration for successful requests', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    Logger.configure({ pretty: true });
    const interceptor = new RvlogHttpLoggingInterceptor({
      level: LogLevel.INFO,
    });

    await firstValueFrom(
      interceptor.intercept(createHttpContext(201), {
        handle: () => of({ ok: true }),
      }),
    );

    const output = infoSpy.mock.calls.flat().join(' ');
    expect(output).toContain('POST /participations called');
    expect(output).toContain('POST /participations completed 201');
    expect(output).not.toContain('identityToken');
    expect(output).not.toContain('secret-token');
  });

  it('leaves thrown failures to the global exception filter', async () => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    Logger.configure({ pretty: true });
    const interceptor = new RvlogHttpLoggingInterceptor({
      level: LogLevel.INFO,
    });
    const error = new HttpException('raw identity payload', 503);

    await expect(
      firstValueFrom(
        interceptor.intercept(createHttpContext(), {
          handle: () => throwError(() => error),
        }),
      ),
    ).rejects.toBe(error);

    const output = [...errorSpy.mock.calls, ...warnSpy.mock.calls]
      .flat()
      .join(' ');
    expect(output).not.toContain('POST /participations failed 503');
    expect(output).not.toContain('raw identity payload');
    expect(output).not.toContain('identityToken');
    expect(output).not.toContain('secret-token');
  });

  it('logs non-exception 4XX responses at WARN', async () => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    Logger.configure({ pretty: true });
    const interceptor = new RvlogHttpLoggingInterceptor({
      level: LogLevel.INFO,
    });

    await firstValueFrom(
      interceptor.intercept(createHttpContext(404), {
        handle: () => of({ ok: false }),
      }),
    );

    expect(warnSpy.mock.calls.flat().join(' ')).toContain(
      'POST /participations failed 404',
    );
  });
});
