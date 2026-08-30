import { Inject, Injectable } from '@nestjs/common';
import {
  SMS_DISPATCH_READ_REPOSITORY_PORT,
  type SmsDispatchReadRepositoryPort,
} from '../../port/persistence/query/sms-dispatch-read-repository.port';
import type { GetSmsDispatchQuery } from '../dto/request/get-sms-dispatch.query';
import type { SmsDispatchView } from '../dto/response/sms-dispatch.view';

export class SmsDispatchNotFoundError extends Error {
  constructor() {
    super('SMS dispatch not found');
    this.name = 'SmsDispatchNotFoundError';
  }
}

@Injectable()
export class GetSmsDispatchHandler {
  constructor(
    @Inject(SMS_DISPATCH_READ_REPOSITORY_PORT)
    private readonly repository: SmsDispatchReadRepositoryPort,
  ) {}

  async execute(query: GetSmsDispatchQuery): Promise<SmsDispatchView> {
    const dispatch = await this.repository.findDetail(query);
    if (!dispatch) throw new SmsDispatchNotFoundError();
    return dispatch;
  }
}
