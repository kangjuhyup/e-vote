import { Inject, Injectable } from '@nestjs/common';
import {
  SMS_DISPATCH_READ_REPOSITORY_PORT,
  type SmsDispatchReadRepositoryPort,
} from '../../port/persistence/query/sms-dispatch-read-repository.port';
import type { GetSmsDispatchPageQuery } from '../dto/request/get-sms-dispatch-page.query';
import type { SmsDispatchPageView } from '../dto/response/sms-dispatch.view';

@Injectable()
export class GetSmsDispatchPageHandler {
  constructor(
    @Inject(SMS_DISPATCH_READ_REPOSITORY_PORT)
    private readonly repository: SmsDispatchReadRepositoryPort,
  ) {}

  execute(query: GetSmsDispatchPageQuery): Promise<SmsDispatchPageView> {
    return this.repository.findPage(query);
  }
}
