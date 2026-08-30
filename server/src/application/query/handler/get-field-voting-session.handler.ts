import { Inject, Injectable } from '@nestjs/common';
import {
  FIELD_VOTING_SESSION_READ_REPOSITORY_PORT,
  type FieldVotingSessionReadRepositoryPort,
} from '../../port/persistence/query/field-voting-session-read-repository.port';
import { GetFieldVotingSessionQuery } from '../get-field-voting-session.query';
import type { FieldVotingSessionView } from '../view/field-voting-session.view';

export class FieldVotingSessionReadNotFoundError extends Error {
  constructor() {
    super('field voting session not found');
  }
}

@Injectable()
export class GetFieldVotingSessionHandler {
  constructor(
    @Inject(FIELD_VOTING_SESSION_READ_REPOSITORY_PORT)
    private readonly repository: FieldVotingSessionReadRepositoryPort,
  ) {}

  async execute(
    query: GetFieldVotingSessionQuery,
  ): Promise<FieldVotingSessionView> {
    const session = await this.repository.findDetailById(
      query.fieldVotingSessionId,
    );

    if (!session) {
      throw new FieldVotingSessionReadNotFoundError();
    }

    return session;
  }
}
