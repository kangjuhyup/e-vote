import {
  ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { HttpExceptionLogger } from '../../../src/shared/presentation/common/filter/http-exception-logger';
import { HttpExceptionFilter } from '../../../src/shared/presentation/common/filter/http-exception.filter';

function createHost(params: {
  method?: string;
  path?: string;
  originalUrl?: string;
}): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const status = jest.fn();
  const json = jest.fn();
  status.mockReturnValue({ json });
  const request = {
    method: params.method ?? 'GET',
    path: params.path ?? '/votes',
    originalUrl: params.originalUrl ?? '/votes',
  } as Request;
  const response = {
    status,
    getHeader: jest.fn().mockReturnValue(undefined),
    locals: {},
  } as unknown as Response;

  return {
    host: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost,
    status,
    json,
  };
}

describe('HttpExceptionFilter logging', () => {
  let logger: jest.Mocked<HttpExceptionLogger>;

  beforeEach(() => {
    logger = {
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  it('logs 4XX failures at WARN without the exception payload or query', () => {
    const filter = new HttpExceptionFilter(logger);
    const { host } = createHost({
      method: 'POST',
      path: '/participations',
      originalUrl: '/participations?identityToken=secret-token',
    });

    filter.catch(new BadRequestException('raw identity payload'), host);

    expect(logger.warn.mock.calls).toContainEqual([
      'POST /participations failed 400',
    ]);
    expect(logger.error.mock.calls).toHaveLength(0);
    const output = logger.warn.mock.calls.flat().join(' ');
    expect(output).not.toContain('raw identity payload');
    expect(output).not.toContain('identityToken');
    expect(output).not.toContain('secret-token');
  });

  it.each([
    new Error('database password leaked'),
    new InternalServerErrorException('raw identity payload'),
  ])('logs sanitized stack frames for 5XX failures', (exception) => {
    exception.stack = [
      `${exception.name}: ${exception.message}`,
      'sensitive multiline detail',
      '    at persistVote (/srv/vote.handler.ts:42:7)',
    ].join('\n');
    const filter = new HttpExceptionFilter(logger);
    const { host } = createHost({ method: 'POST' });

    filter.catch(exception, host);

    expect(logger.warn.mock.calls).toHaveLength(0);
    expect(logger.error.mock.calls).toHaveLength(1);
    const [message, loggedError] = logger.error.mock.calls[0] ?? [];
    expect(message).toBe('POST /votes failed 500');
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError?.stack).toContain(
      'at persistVote (/srv/vote.handler.ts:42:7)',
    );
    expect(loggedError?.stack).not.toContain(exception.message);
    expect(loggedError?.stack).not.toContain('sensitive multiline detail');
  });
});
