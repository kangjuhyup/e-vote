import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  INestApplication,
  InternalServerErrorException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/shared/presentation/common/filter/http-exception.filter';
import { ResponseInterceptor } from '../src/shared/presentation/common/interceptor/response.interceptor';
import { Public } from '../src/shared/presentation/common/decorator/public.decorator';
import { User } from '../src/shared/presentation/common/decorator/user.decorator';
import { UserPrincipal } from '../src/shared/application/security/user-principal';
import { ACCESS_TOKEN_VERIFIER_PORT } from '../src/shared/application/port/security/access-token-verifier.port';
import { AUTHZ_ASSERTION_KEY } from '../src/platform/authentication/authz-assertion-verifier.adapter';
import { DATABASE_HEALTH_PORT } from '../src/shared/application/port/health/database-health.port';
import { REDIS_HEALTH_PORT } from '../src/shared/application/port/health/redis-health.port';
import { STORAGE_HEALTH_PORT } from '../src/shared/application/port/health/storage-health.port';
import type { HttpExceptionLogger } from '../src/shared/presentation/common/filter/http-exception-logger';

type HttpTestResponse = {
  readonly body: unknown;
  readonly headers: Record<string, string | string[] | undefined>;
};

function expectBodyWithTimestamp(
  body: unknown,
  expected: Record<string, unknown>,
): void {
  const timestampedBody = body as { timestamp?: unknown };

  expect(body).toMatchObject(expected);
  expect(typeof timestampedBody.timestamp).toBe('string');
}

@Controller()
@Public()
class TestErrorController {
  @Get('error/http')
  getHttpError(): never {
    throw new InternalServerErrorException('expected http error');
  }

  @Get('error/unknown')
  getUnknownError(): never {
    throw new Error('sensitive internal error');
  }
}

@Controller()
class TestAuthenticatedController {
  @Get('authenticated-user')
  getAuthenticatedUser(@User() user: UserPrincipal): { id: string } {
    return { id: user.id };
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let exceptionLogger: jest.Mocked<HttpExceptionLogger>;

  beforeEach(async () => {
    exceptionLogger = {
      warn: jest.fn(),
      error: jest.fn(),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestErrorController, TestAuthenticatedController],
    })
      .overrideProvider(AUTHZ_ASSERTION_KEY)
      .useValue('test-authz-assertion-key-at-least-32-bytes')
      .overrideProvider(ACCESS_TOKEN_VERIFIER_PORT)
      .useValue({
        verify: (accessToken: string): Promise<UserPrincipal> => {
          if (accessToken !== 'valid-test-token') {
            return Promise.reject(new Error('invalid token'));
          }

          return Promise.resolve(UserPrincipal.of({ id: 'verified-user-1' }));
        },
      })
      .overrideProvider(DATABASE_HEALTH_PORT)
      .useValue({ ping: () => Promise.resolve({ status: 'up' }) })
      .overrideProvider(REDIS_HEALTH_PORT)
      .useValue({ ping: () => Promise.resolve({ status: 'up' }) })
      .overrideProvider(STORAGE_HEALTH_PORT)
      .useValue({ ping: () => Promise.resolve({ status: 'up' }) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.headers.authorization) {
        req.headers['x-vote-authz-assertion'] = 'test-proxy-assertion';
      }
      next();
    });
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter(exceptionLogger));
    await app.init();
  });

  it('/ (GET)', async () => {
    const response = (await request(app.getHttpServer())
      .get('/')
      .set('x-request-id', 'request-123')
      .expect(200)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: true,
      data: 'Hello World!',
      requestId: 'request-123',
    });
  });

  it('reuses supplied x-request-id header', async () => {
    const response = (await request(app.getHttpServer())
      .get('/')
      .set('x-request-id', 'request-123')
      .expect(200)) as HttpTestResponse;

    expect(response.headers['x-request-id']).toBe('request-123');
  });

  it('generates x-request-id when missing', async () => {
    const response = (await request(app.getHttpServer())
      .get('/')
      .expect(200)) as HttpTestResponse;

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).not.toHaveLength(0);
    expect(response.body).toMatchObject({
      requestId: response.headers['x-request-id'],
    });
  });

  it('/liveness (GET)', async () => {
    const response = (await request(app.getHttpServer())
      .get('/liveness')
      .set('x-request-id', 'request-liveness')
      .expect(200)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: true,
      data: {
        status: 'ok',
      },
      requestId: 'request-liveness',
    });
  });

  it('/readiness (GET) reports all configured dependencies as ready', async () => {
    const response = (await request(app.getHttpServer())
      .get('/readiness')
      .set('x-request-id', 'request-readiness')
      .expect(200)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: true,
      data: {
        status: 'ok',
        checks: {
          database: 'up',
          redis: 'up',
          storage: 'up',
        },
      },
      requestId: 'request-readiness',
    });
  });

  it('/votes (GET) requires a verified bearer access token', async () => {
    const response = (await request(app.getHttpServer())
      .get('/votes')
      .set('x-request-id', 'request-protected')
      .expect(401)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: false,
      error: {
        statusCode: 401,
        message: 'bearer access token is required',
        path: '/votes',
      },
      requestId: 'request-protected',
    });
    expect(exceptionLogger.warn.mock.calls).toContainEqual([
      'GET /votes failed 401',
    ]);
    expect(exceptionLogger.error.mock.calls).toHaveLength(0);
  });

  it('rejects malformed UUID route parameters before database access', async () => {
    const response = (await request(app.getHttpServer())
      .get('/votes/not-a-uuid')
      .set('authorization', 'Bearer valid-test-token')
      .set('x-request-id', 'request-invalid-uuid')
      .expect(400)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: false,
      error: {
        statusCode: 400,
        message: 'voteId must be a UUID',
        path: '/votes/not-a-uuid',
      },
      requestId: 'request-invalid-uuid',
    });
    expect(exceptionLogger.warn.mock.calls).toContainEqual([
      'GET /votes/not-a-uuid failed 400',
    ]);
    expect(exceptionLogger.error.mock.calls).toHaveLength(0);
  });

  it('rejects malformed UUID body fields before database access', async () => {
    const response = (await request(app.getHttpServer())
      .post('/votes')
      .set('authorization', 'Bearer valid-test-token')
      .set('x-request-id', 'request-invalid-body-uuid')
      .send({
        commissionId: 'commission-1',
        title: 'Board election',
        votingChannels: ['ONLINE'],
        defaultPolicy: {
          privacyMode: 'SECRET',
          participationUnit: 'INDIVIDUAL',
          resultStorageMode: 'DATABASE',
          voteWeightMode: 'EQUAL',
        },
        identityVerificationPolicy: { required: false },
      })
      .expect(400)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: false,
      error: {
        statusCode: 400,
        message: 'commissionId must be a UUID',
        path: '/votes',
      },
      requestId: 'request-invalid-body-uuid',
    });
    expect(exceptionLogger.warn.mock.calls).toContainEqual([
      'POST /votes failed 400',
    ]);
    expect(exceptionLogger.error.mock.calls).toHaveLength(0);
  });

  it('creates request.user from a verified bearer access token', async () => {
    const response = (await request(app.getHttpServer())
      .get('/authenticated-user')
      .set('authorization', 'Bearer valid-test-token')
      .set('x-request-id', 'request-authenticated')
      .expect(200)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: true,
      data: { id: 'verified-user-1' },
      requestId: 'request-authenticated',
    });
  });

  it('wraps HTTP exceptions', async () => {
    const response = (await request(app.getHttpServer())
      .get('/error/http')
      .set('x-request-id', 'request-http-error')
      .expect(500)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: false,
      error: {
        statusCode: 500,
        message: 'expected http error',
        path: '/error/http',
      },
      requestId: 'request-http-error',
    });
    expect(exceptionLogger.error.mock.calls).toHaveLength(1);
  });

  it('wraps unknown errors without leaking internal messages', async () => {
    const response = (await request(app.getHttpServer())
      .get('/error/unknown')
      .set('x-request-id', 'request-unknown-error')
      .expect(500)) as HttpTestResponse;

    expectBodyWithTimestamp(response.body, {
      success: false,
      error: {
        statusCode: 500,
        message: 'Internal server error',
        path: '/error/unknown',
      },
      requestId: 'request-unknown-error',
    });
    expect(exceptionLogger.error.mock.calls).toHaveLength(1);
    const loggedError = exceptionLogger.error.mock.calls[0]?.[1];
    expect(loggedError?.stack).toContain('TestErrorController.getUnknownError');
    expect(loggedError?.stack).not.toContain('sensitive internal error');
  });

  afterEach(async () => {
    await app.close();
  });
});
