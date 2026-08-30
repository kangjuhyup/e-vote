import { Inject, Injectable, Optional } from '@nestjs/common';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import { SmsSenderNotConfiguredError } from '../../../../../shared/application/error/sms-sender.error';
import {
  SMS_SENDER_PORT,
  type SmsSendResult,
  type SmsSenderPort,
} from '../../../../../shared/application/port/gateway/sms-sender.port';
import {
  SMS_DISPATCH_REPOSITORY_PORT,
  type SmsDispatchRepositoryPort,
} from '../../../../../shared/application/port/persistence/sms-dispatch-repository.port';
import { SmsDispatchAggregate } from '../../../../../shared/domain/sms/sms-dispatch.aggregate';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import { SmsMessagePurpose } from '../../../../../shared/domain/voting/type/sms-message-purpose.type';
import { VoteSmsPolicy } from '../../../../../shared/domain/voting/vote-sms.policy';
import { SendVoteSmsCommand } from '../dto/request/send-vote-sms.command';
import { SendVoteSmsResult } from '../dto/response/send-vote-sms-result.dto';

@Injectable()
export class SendVoteSmsHandler {
  constructor(
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteRepository: VoteAccessPort,
    @Inject(SMS_DISPATCH_REPOSITORY_PORT)
    private readonly smsDispatchRepository: SmsDispatchRepositoryPort,
    @Optional()
    @Inject(SMS_SENDER_PORT)
    private readonly smsSender?: SmsSenderPort,
  ) {}

  async execute(command: SendVoteSmsCommand): Promise<SendVoteSmsResult> {
    const vote = await this.voteRepository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');

    VoteSmsPolicy.assertVoteMessageAllowed(vote, command.purpose);

    if (!this.smsSender) throw new SmsSenderNotConfiguredError();

    const result = await this.send(command, this.smsSender);
    const dispatch = this.createDispatch(command, result);
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

  private send(command: SendVoteSmsCommand, smsSender: SmsSenderPort) {
    const request = { voteId: command.voteId, message: command.message };

    switch (command.purpose) {
      case SmsMessagePurpose.VoteParticipationReminder:
        return smsSender.sendParticipationReminderToNonParticipants(request);
      case SmsMessagePurpose.VoteResultNotice:
        return smsSender.sendResultNotice(request);
      case SmsMessagePurpose.UpcomingVoteNotice:
        return smsSender.sendUpcomingVoteNotice(request);
    }
  }

  private createDispatch(
    command: SendVoteSmsCommand,
    result: SmsSendResult,
  ): SmsDispatchAggregate {
    return SmsDispatchAggregate.create({
      id: this.smsDispatchRepository.nextId(),
      voteId: command.voteId,
      purpose: command.purpose,
      sentAt: new Date(),
      deliveries: result.deliveries.map((delivery) => ({
        id: this.smsDispatchRepository.nextId(),
        ...delivery,
      })),
    });
  }
}
