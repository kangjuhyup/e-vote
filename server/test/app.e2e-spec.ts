import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  INestApplication,
  InternalServerErrorException,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from '../src/presentation/common/filter/http-exception.filter';
import { LoggingInterceptor } from '../src/presentation/common/interceptor/logging.interceptor';
import { ResponseInterceptor } from '../src/presentation/common/interceptor/response.interceptor';

@Controller()
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

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestErrorController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  it('/ (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .set('x-request-id', 'request-123')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: 'Hello World!',
      timestamp: expect.any(String),
      requestId: 'request-123',
    });
  });

  it('reuses supplied x-request-id header', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .set('x-request-id', 'request-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('request-123');
  });

  it('generates x-request-id when missing', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).not.toHaveLength(0);
  });

  it('/liveness (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/liveness')
      .set('x-request-id', 'request-liveness')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
      },
      timestamp: expect.any(String),
      requestId: 'request-liveness',
    });
  });

  it('/readiness (GET) returns unavailable when database is not configured', async () => {
    const response = await request(app.getHttpServer())
      .get('/readiness')
      .set('x-request-id', 'request-readiness')
      .expect(503);

    expect(response.body).toEqual({
      success: false,
      error: {
        statusCode: 503,
        message: 'database is not ready: not_configured',
        path: '/readiness',
      },
      timestamp: expect.any(String),
      requestId: 'request-readiness',
    });
  });

  it('wraps HTTP exceptions', async () => {
    const response = await request(app.getHttpServer())
      .get('/error/http')
      .set('x-request-id', 'request-http-error')
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      error: {
        statusCode: 500,
        message: 'expected http error',
        path: '/error/http',
      },
      timestamp: expect.any(String),
      requestId: 'request-http-error',
    });
  });

  it('wraps unknown errors without leaking internal messages', async () => {
    const response = await request(app.getHttpServer())
      .get('/error/unknown')
      .set('x-request-id', 'request-unknown-error')
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      error: {
        statusCode: 500,
        message: 'Internal server error',
        path: '/error/unknown',
      },
      timestamp: expect.any(String),
      requestId: 'request-unknown-error',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
