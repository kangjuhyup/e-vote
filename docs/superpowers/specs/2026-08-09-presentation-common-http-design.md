# Presentation Common HTTP Design

## Goal

Add common NestJS HTTP infrastructure for request tracing, request logging, success response wrapping, and error response wrapping in the server presentation layer.

## Scope

- Add presentation-only middleware, interceptors, and exception filter.
- Register the common HTTP behavior globally for all routes.
- Keep domain and application layers free of NestJS HTTP concerns.
- Do not add business-specific controller behavior in this change.

## Directory Structure

```text
server/src/presentation/common/
  filter/
    http-exception.filter.ts
  interceptor/
    logging.interceptor.ts
    response.interceptor.ts
  middleware/
    request-id.middleware.ts
```

`server/src/presentation` is the owner of HTTP request/response behavior. Route-specific controllers remain under `server/src/presentation/route/<resource>`.

## Request Id Middleware

`RequestIdMiddleware` reads the incoming `x-request-id` header. If the header is missing, it creates a new request id with `crypto.randomUUID()`.

The middleware stores the id on the request object and sets `x-request-id` on the response. Downstream interceptors and filters use this value for logging and response metadata.

## Logging Interceptor

`LoggingInterceptor` logs one line per completed request with:

- HTTP method
- original URL
- status code
- duration in milliseconds
- request id

It logs after the route handler completes or errors, so status and duration reflect the actual request result.

## Response Interceptor

`ResponseInterceptor` wraps successful responses in a consistent envelope:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-08-09T00:00:00.000Z",
  "requestId": "request-id"
}
```

The interceptor only handles successful handler results. Error responses are handled by the exception filter.

## HTTP Exception Filter

`HttpExceptionFilter` wraps thrown errors in a consistent envelope:

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Bad Request",
    "path": "/votes"
  },
  "timestamp": "2026-08-09T00:00:00.000Z",
  "requestId": "request-id"
}
```

`HttpException` status codes and messages are preserved. Unknown errors return status code 500 and a generic message.

## Registration

Register global interceptors and the global exception filter in `main.ts`.

Apply `RequestIdMiddleware` through `AppModule.configure()` so it runs before interceptors and filters.

## Testing

Add focused tests that verify:

- request id is reused when `x-request-id` is supplied
- request id is generated when missing
- successful responses use the success envelope
- HTTP exceptions use the error envelope
- unknown errors do not leak internal error messages
