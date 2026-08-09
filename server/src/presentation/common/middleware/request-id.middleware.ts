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
