import type { ElectorStatus } from '../../../domain/voting/type/elector-status.type';

export const SMS_RECIPIENT_ACCESS_PORT = Symbol('SMS_RECIPIENT_ACCESS_PORT');

export interface SmsRecipientReference {
  readonly electorId: string;
  readonly name: string;
  readonly identifier: string;
  readonly status: ElectorStatus;
  readonly participated: boolean;
}

export interface SmsRecipientPage {
  readonly items: readonly SmsRecipientReference[];
  readonly totalPages: number;
}

export interface SmsRecipientAccessPort {
  findPage(request: {
    readonly voteId: string;
    readonly page: number;
    readonly pageSize: number;
  }): Promise<SmsRecipientPage>;
}
