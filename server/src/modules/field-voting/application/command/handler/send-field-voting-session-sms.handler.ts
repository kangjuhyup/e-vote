import { Inject, Injectable, Optional } from '@nestjs/common';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import { SmsSenderNotConfiguredError } from '../../../../../shared/application/error/sms-sender.error';
import {
  FIELD_VOTING_SESSION_ACCESS_PORT,
  type FieldVotingSessionAccessPort,
} from '../../../../../shared/application/port/capability/field-voting-access.port';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import {
  SMS_SENDER_PORT,
  type SmsSenderPort,
} from '../../../../../shared/application/port/gateway/sms-sender.port';
import {
  SMS_DISPATCH_REPOSITORY_PORT,
  type SmsDispatchRepositoryPort,
} from '../../../../../shared/application/port/persistence/sms-dispatch-repository.port';
import { SmsDispatchAggregate } from '../../../../../shared/domain/sms/sms-dispatch.aggregate';
import { SmsMessagePurpose } from '../../../../../shared/domain/voting/type/sms-message-purpose.type';
import { VoteSmsPolicy } from '../../../../../shared/domain/voting/vote-sms.policy';
import { SendFieldVotingSessionSmsCommand } from '../dto/request/send-field-voting-session-sms.command';
import { SendFieldVotingSessionSmsResult } from '../dto/response/send-field-voting-session-sms-result.dto';

@Injectable()
export class SendFieldVotingSessionSmsHandler {
  constructor(
    @Inject(FIELD_VOTING_SESSION_ACCESS_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionAccessPort,
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteRepository: VoteAccessPort,
    @Inject(SMS_DISPATCH_REPOSITORY_PORT)
    private readonly smsDispatchRepository: SmsDispatchRepositoryPort,
    @Optional()
    @Inject(SMS_SENDER_PORT)
    private readonly smsSender?: SmsSenderPort,
  ) {}

  async execute(
    command: SendFieldVotingSessionSmsCommand,
  ): Promise<SendFieldVotingSessionSmsResult> {
    const session = await this.fieldVotingSessionRepository.findById(
      command.fieldVotingSessionId,
    );
    if (!session) {
      throw new ManagedResourceNotFoundError('field voting session');
    }

    const vote = await this.voteRepository.findById(session.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');

    VoteSmsPolicy.assertFieldSessionMessageAllowed(vote, session);

    if (!this.smsSender) throw new SmsSenderNotConfiguredError();

    const result = await this.smsSender.sendFieldVotingSessionNotice({
      fieldVotingSessionId: session.id,
      voteId: vote.id,
      message: command.message,
    });
    const dispatch = SmsDispatchAggregate.create({
      id: this.smsDispatchRepository.nextId(),
      voteId: vote.id,
      purpose: SmsMessagePurpose.FieldVotingSessionNotice,
      fieldVotingSessionId: session.id,
      sentAt: new Date(),
      deliveries: result.deliveries.map((delivery) => ({
        id: this.smsDispatchRepository.nextId(),
        ...delivery,
      })),
    });
    await this.smsDispatchRepository.save(dispatch);

    return SendFieldVotingSessionSmsResult.of({
      smsDispatchId: dispatch.id,
      fieldVotingSessionId: session.id,
      voteId: vote.id,
      sentAt: dispatch.sentAt,
      recipientCount: dispatch.recipientCount,
      successCount: dispatch.successCount,
      failureCount: dispatch.failureCount,
    });
  }
}
