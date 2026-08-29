import { Inject, Injectable } from '@nestjs/common';
import {
  ChangeFieldVotingSessionStatusResult,
  FieldVotingSessionNotFoundError,
} from './open-field-voting-session.handler';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../../port/persistence/command/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../../port/persistence/command/field-voting-session-repository.port';
import { CloseFieldVotingSessionCommand } from '../close-field-voting-session.command';

@Injectable()
export class CloseFieldVotingSessionHandler {
  constructor(
    @Inject(FIELD_VOTING_SESSION_REPOSITORY_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionRepositoryPort,
  ) {}

  async execute(
    command: CloseFieldVotingSessionCommand,
  ): Promise<ChangeFieldVotingSessionStatusResult> {
    const session = await this.fieldVotingSessionRepository.findById(
      command.fieldVotingSessionId,
    );

    if (!session) {
      throw new FieldVotingSessionNotFoundError();
    }

    session.close(command.closedAt);
    await this.fieldVotingSessionRepository.save(session);

    return {
      id: session.id,
      status: session.status,
    };
  }
}
