import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { maskDecoratedPersonalData } from '../serializer/mask-personal-data';
import { RequestWithId } from '../type/request-with-id.type';

type SuccessResponse<T> = {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();

    return next.handle().pipe(
      map((data) => {
        const maskedData = maskDecoratedPersonalData(data);

        return {
          success: true,
          data: maskedData,
          timestamp: new Date().toISOString(),
          requestId: request.requestId,
        };
      }),
    );
  }
}
