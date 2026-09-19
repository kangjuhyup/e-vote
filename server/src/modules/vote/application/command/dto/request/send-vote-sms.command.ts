import { DomainError } from '../../../../../../shared/domain/domain-error';
import type { VoteSmsMessagePurpose } from '../../../../../../shared/domain/voting/type/sms-message-purpose.type';

export class SendVoteSmsCommand {
  private constructor(
    readonly voteId: string,
    readonly requestedByUserPrincipalId: string,
    readonly purpose: VoteSmsMessagePurpose,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly requestedByUserPrincipalId: string;
    readonly purpose: VoteSmsMessagePurpose;
    readonly message?: string;
  }): SendVoteSmsCommand {
    const requestedByUserPrincipalId = params.requestedByUserPrincipalId.trim();
    if (!requestedByUserPrincipalId) {
      throw new DomainError('SMS requester must not be empty');
    }
    return new SendVoteSmsCommand(
      params.voteId,
      requestedByUserPrincipalId,
      params.purpose,
    );
  }
}
