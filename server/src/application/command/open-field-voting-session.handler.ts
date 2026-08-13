import { Inject, Injectable } from '@nestjs/common';
import { FieldVotingSessionStatus } from '../../domain/field-voting/type/field-voting-session-status.type';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../port/field-voting-session-repository.port';
import type { FieldVotingSessionRepositoryPort } from '../port/field-voting-session-repository.port';
import { OpenFieldVotingSessionCommand } from './open-field-voting-session.command';

export type ChangeFieldVotingSessionStatusResult = {
  id: string;
  status: FieldVotingSessionStatus;
};

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

    return {
      id: session.id,
      status: session.status,
    };
  }
}
