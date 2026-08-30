import { Inject, Injectable } from '@nestjs/common';
import {
  SMS_RECIPIENT_ACCESS_PORT,
  type SmsRecipientAccessPort,
  type SmsRecipientReference,
} from '../../application/port/capability/sms-recipient-access.port';
import type {
  FieldVotingSessionSmsSendRequest,
  SmsRecipientDeliveryResult,
  SmsSenderPort,
  SmsSendResult,
  VoteSmsSendRequest,
} from '../../application/port/gateway/sms-sender.port';
import { SmsDeliveryStatus } from '../../domain/sms/type/sms-delivery-status.type';
import { ElectorStatus } from '../../domain/voting/type/elector-status.type';

const ELECTOR_PAGE_SIZE = 100;
const SIMULATED_SUCCESS_RATE = 0.8;
const SIMULATED_FAILURE_REASON = 'SIMULATED_RANDOM_FAILURE';

@Injectable()
export class RandomSmsSenderAdapter implements SmsSenderPort {
  constructor(
    @Inject(SMS_RECIPIENT_ACCESS_PORT)
    private readonly recipientAccess: SmsRecipientAccessPort,
  ) {}

  sendParticipationReminderToNonParticipants(
    request: VoteSmsSendRequest,
  ): Promise<SmsSendResult> {
    return this.send(request.voteId, (recipient) => !recipient.participated);
  }

  sendResultNotice(request: VoteSmsSendRequest): Promise<SmsSendResult> {
    return this.send(request.voteId);
  }

  sendUpcomingVoteNotice(request: VoteSmsSendRequest): Promise<SmsSendResult> {
    return this.send(request.voteId);
  }

  sendFieldVotingSessionNotice(
    request: FieldVotingSessionSmsSendRequest,
  ): Promise<SmsSendResult> {
    return this.send(request.voteId);
  }

  private async send(
    voteId: string,
    additionalFilter: (recipient: SmsRecipientReference) => boolean = () =>
      true,
  ): Promise<SmsSendResult> {
    const recipients = await this.findAllRecipients(voteId);
    return {
      deliveries: recipients
        .filter(
          (recipient) =>
            recipient.status === ElectorStatus.Eligible &&
            additionalFilter(recipient),
        )
        .map((recipient) => this.createRandomDelivery(recipient)),
    };
  }

  private async findAllRecipients(
    voteId: string,
  ): Promise<SmsRecipientReference[]> {
    const recipients: SmsRecipientReference[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const result = await this.recipientAccess.findPage({
        voteId,
        page,
        pageSize: ELECTOR_PAGE_SIZE,
      });
      recipients.push(...result.items);
      totalPages = result.totalPages;
      page += 1;
    }

    return recipients;
  }

  private createRandomDelivery(
    recipient: SmsRecipientReference,
  ): SmsRecipientDeliveryResult {
    if (Math.random() < SIMULATED_SUCCESS_RATE) {
      return {
        electorId: recipient.electorId,
        recipientName: recipient.name,
        recipientIdentifier: recipient.identifier,
        status: SmsDeliveryStatus.Success,
      };
    }

    return {
      electorId: recipient.electorId,
      recipientName: recipient.name,
      recipientIdentifier: recipient.identifier,
      status: SmsDeliveryStatus.Failure,
      failureReason: SIMULATED_FAILURE_REASON,
    };
  }
}
