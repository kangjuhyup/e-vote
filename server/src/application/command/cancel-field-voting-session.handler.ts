import { Inject, Injectable } from '@nestjs/common';
import {
  ChangeFieldVotingSessionStatusResult,
  FieldVotingSessionNotFoundError,
} from './open-field-voting-session.handler';
import { CancelFieldVotingSessionCommand } from './cancel-field-voting-session.command';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../port/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../port/field-voting-session-repository.port';

@Injectable()
export class CancelFieldVotingSessionHandler {
  constructor(
    @Inject(FIELD_VOTING_SESSION_REPOSITORY_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionRepositoryPort,
  ) {}

  async execute(
    command: CancelFieldVotingSessionCommand,
  ): Promise<ChangeFieldVotingSessionStatusResult> {
    const session = await this.fieldVotingSessionRepository.findById(
      command.fieldVotingSessionId,
    );

    if (!session) {
      throw new FieldVotingSessionNotFoundError();
    }

    session.cancel(command.canceledAt);
    await this.fieldVotingSessionRepository.save(session);

    return {
      id: session.id,
      status: session.status,
    };
  }
}
