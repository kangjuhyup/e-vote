import { DomainError } from '../../../../../../shared/domain/domain-error';

export class SendFieldVotingSessionSmsCommand {
  private constructor(
    readonly fieldVotingSessionId: string,
    readonly message: string,
  ) {}

  static of(params: {
    readonly fieldVotingSessionId: string;
    readonly message: string;
  }): SendFieldVotingSessionSmsCommand {
    const message = params.message.trim();

    if (message.length === 0) {
      throw new DomainError('sms message must not be empty');
    }

    return new SendFieldVotingSessionSmsCommand(
      params.fieldVotingSessionId,
      message,
    );
  }
}
