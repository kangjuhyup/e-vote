import type {
  SmsDispatchPageView,
  SmsDispatchView,
} from '../../../query/dto/response/sms-dispatch.view';

export const SMS_DISPATCH_READ_REPOSITORY_PORT = Symbol(
  'SMS_DISPATCH_READ_REPOSITORY_PORT',
);

export interface SmsDispatchReadRepositoryPort {
  findPage(request: {
    readonly voteId: string;
    readonly page: number;
    readonly pageSize: number;
  }): Promise<SmsDispatchPageView>;
  findDetail(request: {
    readonly voteId: string;
    readonly smsDispatchId: string;
  }): Promise<SmsDispatchView | undefined>;
}
