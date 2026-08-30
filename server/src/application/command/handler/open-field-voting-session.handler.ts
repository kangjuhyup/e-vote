import { Inject, Injectable } from '@nestjs/common';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../../port/persistence/command/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../../port/persistence/command/field-voting-session-repository.port';
import { OpenFieldVotingSessionCommand } from '../dto/request/open-field-voting-session.command';
import { ChangeFieldVotingSessionStatusResult } from '../dto/response/change-field-voting-session-status-result.dto';

export class FieldVotingSessionNotFoundError extends Error {
  constructor() {
    super('field voting session not found');
  }
}

@Injectable()
export class OpenFieldVotingSessionHandler {
  constructor(
    @Inject(FIELD_VOTING_SESSION_REPOSITORY_PORT)
    private readonly fieldVotingSessionRepository: FieldVotingSessionRepositoryPort,
  ) {}

  async execute(
    command: OpenFieldVotingSessionCommand,
  ): Promise<ChangeFieldVotingSessionStatusResult> {
    const session = await this.fieldVotingSessionRepository.findById(
      command.fieldVotingSessionId,
    );

    if (!session) {
      throw new FieldVotingSessionNotFoundError();
    }

    session.open(command.openedAt);
    await this.fieldVotingSessionRepository.save(session);

    return ChangeFieldVotingSessionStatusResult.of({
      id: session.id,
      status: session.status,
    });
  }
}
