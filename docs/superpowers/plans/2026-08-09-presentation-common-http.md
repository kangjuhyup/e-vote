# Presentation Common HTTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add global NestJS presentation middleware, interceptors, and an exception filter for request ids, request logging, success response envelopes, and error response envelopes.

**Architecture:** HTTP-only behavior lives under `server/src/presentation/common`. `RequestIdMiddleware` runs before route handlers, `ResponseInterceptor` wraps successful handler results, `LoggingInterceptor` records request completion, and `HttpExceptionFilter` wraps errors. Domain and application code remain untouched.

**Tech Stack:** NestJS 11, Express adapter types, RxJS, Jest, Supertest, TypeScript.

## Global Constraints

- Add presentation-only middleware, interceptors, and exception filter.
- Register the common HTTP behavior globally for all routes.
- Keep domain and application layers free of NestJS HTTP concerns.
- Do not add business-specific controller behavior in this change.
- Use `crypto.randomUUID()` to generate missing request ids.
- Preserve `HttpException` status codes and messages.
- Unknown errors return status code 500 and a generic message.

---

## File Structure

- Create `server/src/presentation/common/type/request-with-id.type.ts`
  - Defines the Express request shape shared by middleware, interceptors, and filters.
- Create `server/src/presentation/common/middleware/request-id.middleware.ts`
  - Reads or generates `requestId`, stores it on the request, and sets the response `x-request-id` header.
- Create `server/src/presentation/common/interceptor/response.interceptor.ts`
  - Wraps successful responses in `{ success, data, timestamp, requestId }`.
- Create `server/src/presentation/common/interceptor/logging.interceptor.ts`
  - Logs method, URL, status, duration, and request id after success or error.
- Create `server/src/presentation/common/filter/http-exception.filter.ts`
  - Wraps `HttpException` and unknown errors in `{ success, error, timestamp, requestId }`.
- Modify `server/src/app.module.ts`
  - Implements `NestModule.configure()` and applies `RequestIdMiddleware` to all routes.
- Modify `server/src/main.ts`
  - Registers the response/logging interceptors and exception filter globally.
- Modify `server/test/app.e2e-spec.ts`
  - Verifies middleware, success envelope, and error envelope behavior through HTTP.

---

### Task 1: Request Id Middleware

**Files:**
- Create: `server/src/presentation/common/type/request-with-id.type.ts`
- Create: `server/src/presentation/common/middleware/request-id.middleware.ts`
- Modify: `server/src/app.module.ts`
- Test: `server/test/app.e2e-spec.ts`

**Interfaces:**
- Produces: `RequestWithId`, an Express request type with optional `requestId: string`.
- Produces: `RequestIdMiddleware.use(request: RequestWithId, response: Response, next: NextFunction): void`.
- Consumes later: `request.requestId` is read by interceptors and filters.

- [ ] **Step 1: Write failing e2e tests for request id behavior**

Update `server/test/app.e2e-spec.ts` with these tests:

```typescript
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @vote/server exec jest --config ./test/jest-e2e.json --runInBand`

Expected: FAIL because `x-request-id` is not set.

- [ ] **Step 3: Add shared request type**

Create `server/src/presentation/common/type/request-with-id.type.ts`:

```typescript
import { Request } from 'express';

export type RequestWithId = Request & {
  requestId?: string;
};
```

- [ ] **Step 4: Add request id middleware**

Create `server/src/presentation/common/middleware/request-id.middleware.ts`:

```typescript
import { randomUUID } from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { RequestWithId } from '../type/request-with-id.type';

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const requestIdHeader = request.headers[REQUEST_ID_HEADER];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader;

    request.requestId = requestId || randomUUID();
    response.setHeader(REQUEST_ID_HEADER, request.requestId);

    next();
  }
}
```

- [ ] **Step 5: Register middleware globally**

Modify `server/src/app.module.ts`:

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestIdMiddleware } from './presentation/common/middleware/request-id.middleware';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
```

- [ ] **Step 6: Run tests to verify pass**

Run: `pnpm --filter @vote/server exec jest --config ./test/jest-e2e.json --runInBand`

Expected: PASS for request id tests; existing root response assertion may still need Task 2 if it expects raw `"Hello World!"`.

---

### Task 2: Success Response and Logging Interceptors

**Files:**
- Create: `server/src/presentation/common/interceptor/response.interceptor.ts`
- Create: `server/src/presentation/common/interceptor/logging.interceptor.ts`
- Modify: `server/src/main.ts`
- Modify: `server/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `RequestWithId` from Task 1.
- Produces: `ResponseInterceptor.intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<unknown>>`.
- Produces: `LoggingInterceptor.intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>`.

- [ ] **Step 1: Update e2e success response expectation**

Replace the root GET expectation in `server/test/app.e2e-spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @vote/server exec jest --config ./test/jest-e2e.json --runInBand`

Expected: FAIL because successful responses are not wrapped yet.

- [ ] **Step 3: Add response interceptor**

Create `server/src/presentation/common/interceptor/response.interceptor.ts`:

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequestWithId } from '../type/request-with-id.type';

type SuccessResponse<T> = {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
};

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        requestId: request.requestId,
      })),
    );
  }
}
```

- [ ] **Step 4: Add logging interceptor**

Create `server/src/presentation/common/interceptor/logging.interceptor.ts`:

```typescript
import {
  CallHandler,
  ExecutionContext,
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
            typeof error === 'object' &&
            error !== null &&
            'getStatus' in error &&
            typeof error.getStatus === 'function'
              ? error.getStatus()
              : 500;

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
```

- [ ] **Step 5: Register interceptors globally**

Modify `server/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './presentation/common/interceptor/logging.interceptor';
import { ResponseInterceptor } from './presentation/common/interceptor/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

- [ ] **Step 6: Mirror global registration in e2e setup**

Because e2e tests create the Nest app directly from `AppModule`, update `server/test/app.e2e-spec.ts` before `app.init()`:

```typescript
app = moduleFixture.createNestApplication();
app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
await app.init();
```

Also import:

```typescript
import { LoggingInterceptor } from '../src/presentation/common/interceptor/logging.interceptor';
import { ResponseInterceptor } from '../src/presentation/common/interceptor/response.interceptor';
```

- [ ] **Step 7: Run tests to verify pass**

Run: `pnpm --filter @vote/server exec jest --config ./test/jest-e2e.json --runInBand`

Expected: PASS for request id and success envelope tests.

---

### Task 3: HTTP Exception Filter

**Files:**
- Create: `server/src/presentation/common/filter/http-exception.filter.ts`
- Modify: `server/src/main.ts`
- Modify: `server/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `RequestWithId` from Task 1.
- Produces: `HttpExceptionFilter.catch(exception: unknown, host: ArgumentsHost): void`.

- [ ] **Step 1: Add test-only routes for error envelopes**

Add this controller inside `server/test/app.e2e-spec.ts`:

```typescript
import { Controller, Get, InternalServerErrorException } from '@nestjs/common';

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
```

Register the controller in the testing module:

```typescript
const moduleFixture: TestingModule = await Test.createTestingModule({
  imports: [AppModule],
  controllers: [TestErrorController],
}).compile();
```

- [ ] **Step 2: Write failing e2e tests for error envelopes**

Add to `server/test/app.e2e-spec.ts`:

```typescript
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
```

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm --filter @vote/server exec jest --config ./test/jest-e2e.json --runInBand`

Expected: FAIL because errors are still using Nest's default response shape.

- [ ] **Step 4: Add exception filter**

Create `server/src/presentation/common/filter/http-exception.filter.ts`:

```typescript
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
```

- [ ] **Step 5: Register filter globally**

Modify `server/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './presentation/common/filter/http-exception.filter';
import { LoggingInterceptor } from './presentation/common/interceptor/logging.interceptor';
import { ResponseInterceptor } from './presentation/common/interceptor/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

- [ ] **Step 6: Mirror filter registration in e2e setup**

Update `server/test/app.e2e-spec.ts` before `app.init()`:

```typescript
app = moduleFixture.createNestApplication();
app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
app.useGlobalFilters(new HttpExceptionFilter());
await app.init();
```

Also import:

```typescript
import { HttpExceptionFilter } from '../src/presentation/common/filter/http-exception.filter';
```

- [ ] **Step 7: Run tests to verify pass**

Run: `pnpm --filter @vote/server exec jest --config ./test/jest-e2e.json --runInBand`

Expected: PASS for success and error envelope tests.

---

### Task 4: Final Verification

**Files:**
- Verify: `server/src/presentation/common/**/*.ts`
- Verify: `server/src/app.module.ts`
- Verify: `server/src/main.ts`
- Verify: `server/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: all common presentation behavior from Tasks 1-3.
- Produces: verified common HTTP behavior and compiling server.

- [ ] **Step 1: Run unit tests**

Run: `pnpm --filter @vote/server test -- --runInBand`

Expected: PASS.

- [ ] **Step 2: Run e2e tests**

Run: `pnpm --filter @vote/server exec jest --config ./test/jest-e2e.json --runInBand`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `pnpm --filter @vote/server build`

Expected: PASS.

- [ ] **Step 4: Inspect git diff**

Run: `git diff --stat`

Expected: diff includes only presentation common HTTP files, app registration, test updates, and existing presentation route keep files.
