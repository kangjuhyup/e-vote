import { Inject, Injectable, Optional } from '@nestjs/common';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import { SmsSenderNotConfiguredError } from '../../../../../shared/application/error/sms-sender.error';
import {
  SMS_SENDER_PORT,
  type SmsSendResult,
  type SmsSenderPort,
} from '../../../../../shared/application/port/gateway/sms-sender.port';
import { PARTICIPATION_REMINDER_TEMPLATE } from '../../../../../shared/application/sms/participation-reminder-template';
import {
  SMS_DISPATCH_REPOSITORY_PORT,
  type SmsDispatchRepositoryPort,
} from '../../../../../shared/application/port/persistence/sms-dispatch-repository.port';
import { SmsDispatchAggregate } from '../../../../../shared/domain/sms/sms-dispatch.aggregate';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import {
  VOTE_USAGE_ENTITLEMENT_ACCESS_PORT,
  type VoteUsageEntitlementAccessPort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import { DomainError } from '../../../../../shared/domain/domain-error';
import { SmsMessagePurpose } from '../../../../../shared/domain/voting/type/sms-message-purpose.type';
import { VoteSmsPolicy } from '../../../../../shared/domain/voting/vote-sms.policy';
import {
  PARTICIPATION_REMINDER_LINK_ISSUER_PORT,
  type ParticipationReminderLinkIssuerPort,
} from '../../../../../shared/application/port/capability/participation-reminder-link-issuer.port';
import { SendVoteSmsCommand } from '../dto/request/send-vote-sms.command';
import { SendVoteSmsResult } from '../dto/response/send-vote-sms-result.dto';

export class VoteSmsAccessDeniedError extends Error {
  constructor() {
    super('only the vote creator can send vote SMS messages');
    this.name = 'VoteSmsAccessDeniedError';
  }
}

type SmsSendOutcome = {
  readonly result: SmsSendResult;
  readonly participationInvitationGenerations?: ReadonlyMap<string, number>;
};

@Injectable()
export class SendVoteSmsHandler {
  constructor(
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteRepository: VoteAccessPort,
    @Inject(VOTE_USAGE_ENTITLEMENT_ACCESS_PORT)
    private readonly voteUsageEntitlement: VoteUsageEntitlementAccessPort,
    @Inject(SMS_DISPATCH_REPOSITORY_PORT)
    private readonly smsDispatchRepository: SmsDispatchRepositoryPort,
    @Inject(PARTICIPATION_REMINDER_LINK_ISSUER_PORT)
    private readonly participationReminderLinks: ParticipationReminderLinkIssuerPort,
    @Optional()
    @Inject(SMS_SENDER_PORT)
    private readonly smsSender?: SmsSenderPort,
  ) {}

  async execute(command: SendVoteSmsCommand): Promise<SendVoteSmsResult> {
    const vote = await this.voteRepository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (
      command.purpose === SmsMessagePurpose.VoteParticipationReminder &&
      !vote.isCreatedBy(command.requestedByUserPrincipalId)
    ) {
      throw new VoteSmsAccessDeniedError();
    }

    VoteSmsPolicy.assertVoteMessageAllowed(vote, command.purpose);
    if (
      command.purpose === SmsMessagePurpose.UpcomingVoteNotice &&
      !(await this.voteUsageEntitlement.hasPaidOrder(vote.id))
    ) {
      throw new DomainError(
        'upcoming vote notices require an active paid billing order',
      );
    }

    if (!this.smsSender) throw new SmsSenderNotConfiguredError();

    const outcome = await this.send(command, this.smsSender);
    const dispatch = this.createDispatch(command, outcome);
    await this.smsDispatchRepository.save(dispatch);

    return SendVoteSmsResult.of({
      smsDispatchId: dispatch.id,
      purpose: command.purpose,
      voteId: vote.id,
      sentAt: dispatch.sentAt,
      recipientCount: dispatch.recipientCount,
      successCount: dispatch.successCount,
      failureCount: dispatch.failureCount,
    });
  }

  private async send(
    command: SendVoteSmsCommand,
    smsSender: SmsSenderPort,
  ): Promise<SmsSendOutcome> {
    switch (command.purpose) {
      case SmsMessagePurpose.VoteParticipationReminder: {
        const recipients =
          await this.participationReminderLinks.issueForNonParticipants({
            voteId: command.voteId,
            issuedByUserPrincipalId: command.requestedByUserPrincipalId,
          });
        const result =
          await smsSender.sendParticipationReminderToNonParticipants({
            voteId: command.voteId,
            templateCode: PARTICIPATION_REMINDER_TEMPLATE.code,
            recipients,
          });
        return {
          result,
          participationInvitationGenerations: new Map(
            recipients.map((recipient) => [
              recipient.electorId,
              recipient.invitationGeneration,
            ]),
          ),
        };
      }
      case SmsMessagePurpose.VoteResultNotice:
        return {
          result: await smsSender.sendResultNotice({
            voteId: command.voteId,
            message: command.message!,
          }),
        };
      case SmsMessagePurpose.UpcomingVoteNotice:
        return {
          result: await smsSender.sendUpcomingVoteNotice({
            voteId: command.voteId,
            message: command.message!,
          }),
        };
    }
  }

  private createDispatch(
    command: SendVoteSmsCommand,
    outcome: SmsSendOutcome,
  ): SmsDispatchAggregate {
    return SmsDispatchAggregate.create({
      id: this.smsDispatchRepository.nextId(),
      voteId: command.voteId,
      purpose: command.purpose,
      sentAt: new Date(),
      deliveries: outcome.result.deliveries.map((delivery) => ({
        id: this.smsDispatchRepository.nextId(),
        ...delivery,
        participationInvitationGeneration:
          outcome.participationInvitationGenerations?.get(delivery.electorId),
      })),
    });
  }
}
