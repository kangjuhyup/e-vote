import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PARTICIPATION_INVITATION_ISSUER_PORT,
  type ParticipationInvitationIssuerPort,
} from '../../application/port/capability/participation-invitation-issuer.port';
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
    @Optional()
    @Inject(PARTICIPATION_INVITATION_ISSUER_PORT)
    private readonly invitationIssuer?: ParticipationInvitationIssuerPort,
    @Optional()
    private readonly config?: ConfigService,
  ) {}

  sendParticipationReminderToNonParticipants(
    request: VoteSmsSendRequest,
  ): Promise<SmsSendResult> {
    return this.send(
      request.voteId,
      (recipient) => !recipient.participated,
      (recipient) => this.prepareParticipationMessage(request, recipient),
    );
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
    prepareMessage?: (recipient: SmsRecipientReference) => Promise<void>,
  ): Promise<SmsSendResult> {
    const recipients = await this.findAllRecipients(voteId);
    const eligibleRecipients = recipients.filter(
      (recipient) =>
        recipient.status === ElectorStatus.Eligible &&
        additionalFilter(recipient),
    );
    return {
      deliveries: await Promise.all(
        eligibleRecipients.map(async (recipient) => {
          await prepareMessage?.(recipient);
          return this.createRandomDelivery(recipient);
        }),
      ),
    };
  }

  private async prepareParticipationMessage(
    request: VoteSmsSendRequest,
    recipient: SmsRecipientReference,
  ): Promise<void> {
    if (!this.invitationIssuer) return;
    const invitation = await this.invitationIssuer.issue(
      request.voteId,
      recipient.electorId,
    );
    const baseUrl =
      this.config?.get<string>('PARTICIPATION_PUBLIC_URL') ??
      'http://localhost:3001/participate';
    // The mock sender intentionally does not persist or log the personalized body.
    const personalizedMessage = `${request.message}\n${baseUrl.replace(/#.*$/, '')}#${invitation.rawToken}`;
    void personalizedMessage;
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
