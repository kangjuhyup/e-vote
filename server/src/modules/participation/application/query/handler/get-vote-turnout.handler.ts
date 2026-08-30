import { Inject, Injectable } from '@nestjs/common';
import { VOTE_STATISTICS_READ_REPOSITORY_PORT } from '../../port/persistence/query/vote-statistics-read-repository.port';
import type { VoteStatisticsReadRepositoryPort } from '../../port/persistence/query/vote-statistics-read-repository.port';
import { GetVoteTurnoutQuery } from '../dto/request/get-vote-turnout.query';
import {
  VoteStatisticsInconsistentError,
  VoteStatisticsNotFoundError,
} from '../vote-statistics.error';
import type { VoteTurnoutView } from '../dto/response/vote-turnout.view';

@Injectable()
export class GetVoteTurnoutHandler {
  constructor(
    @Inject(VOTE_STATISTICS_READ_REPOSITORY_PORT)
    private readonly voteStatisticsReadRepository: VoteStatisticsReadRepositoryPort,
  ) {}

  async execute(query: GetVoteTurnoutQuery): Promise<VoteTurnoutView> {
    const turnout = await this.voteStatisticsReadRepository.getTurnout(
      query.voteId,
      query.voteDetailId,
    );

    if (!turnout) {
      throw new VoteStatisticsNotFoundError();
    }

    if (!turnout.groupVoteWeightConsistent) {
      throw new VoteStatisticsInconsistentError();
    }

    return turnout;
  }
}
