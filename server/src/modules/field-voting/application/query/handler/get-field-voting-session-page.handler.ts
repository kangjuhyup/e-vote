import { Inject, Injectable } from '@nestjs/common';
import {
  FIELD_VOTING_SESSION_READ_REPOSITORY_PORT,
  type FieldVotingSessionReadRepositoryPort,
} from '../../port/persistence/query/field-voting-session-read-repository.port';
import { GetFieldVotingSessionPageQuery } from '../dto/request/get-field-voting-session-page.query';
import type { FieldVotingSessionPageView } from '../dto/response/field-voting-session.view';

@Injectable()
export class GetFieldVotingSessionPageHandler {
  constructor(
    @Inject(FIELD_VOTING_SESSION_READ_REPOSITORY_PORT)
    private readonly repository: FieldVotingSessionReadRepositoryPort,
  ) {}

  execute(
    query: GetFieldVotingSessionPageQuery,
  ): Promise<FieldVotingSessionPageView> {
    return this.repository.findPage({
      voteId: query.voteId,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
