import { DomainError } from '../../../../../../shared/domain/domain-error';
import type { VoteSmsMessagePurpose } from '../../../../../../shared/domain/voting/type/sms-message-purpose.type';

export class SendVoteSmsCommand {
  private constructor(
    readonly voteId: string,
    readonly purpose: VoteSmsMessagePurpose,
    readonly message: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly purpose: VoteSmsMessagePurpose;
    readonly message: string;
  }): SendVoteSmsCommand {
    const message = params.message.trim();

    if (message.length === 0) {
      throw new DomainError('sms message must not be empty');
    }

    return new SendVoteSmsCommand(params.voteId, params.purpose, message);
  }
}
