import type { SmsDispatchAggregate } from '../../../domain/sms/sms-dispatch.aggregate';

export const SMS_DISPATCH_REPOSITORY_PORT = Symbol(
  'SMS_DISPATCH_REPOSITORY_PORT',
);

export interface SmsDispatchRepositoryPort {
  nextId(): string;
  save(dispatch: SmsDispatchAggregate): Promise<void>;
}
