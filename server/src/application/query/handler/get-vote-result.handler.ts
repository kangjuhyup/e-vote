import { Inject, Injectable } from '@nestjs/common';
import { VOTE_STATISTICS_READ_REPOSITORY_PORT } from '../../port/persistence/query/vote-statistics-read-repository.port';
import type { VoteStatisticsReadRepositoryPort } from '../../port/persistence/query/vote-statistics-read-repository.port';
import { GetVoteResultQuery } from '../dto/request/get-vote-result.query';
import { VoteResultView } from '../dto/response/vote-result.view';
import { VoteStatisticsNotFoundError } from '../vote-statistics.error';
import { VoteResultUnavailableError } from '../vote-statistics.error';
import { VoteStatisticsInconsistentError } from '../vote-statistics.error';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../domain/vote/type/vote-status.type';

@Injectable()
export class GetVoteResultHandler {
  constructor(
    @Inject(VOTE_STATISTICS_READ_REPOSITORY_PORT)
    private readonly voteStatisticsReadRepository: VoteStatisticsReadRepositoryPort,
  ) {}

  async execute(query: GetVoteResultQuery): Promise<VoteResultView> {
    const result = await this.voteStatisticsReadRepository.getResult(
      query.voteId,
      query.voteDetailId,
    );

    if (!result) {
      throw new VoteStatisticsNotFoundError();
    }

    if (
      result.voteStatus !== VoteStatus.Closed ||
      result.voteDetailStatus !== VoteDetailStatus.Closed
    ) {
      throw new VoteResultUnavailableError();
    }

    if (
      result.participantCount !== result.totalVoteCount ||
      !areVoteWeightsEqual(
        result.participatedVoteWeight,
        result.totalWeightedVoteCount,
      )
    ) {
      throw new VoteStatisticsInconsistentError();
    }

    return result;
  }
}

function areVoteWeightsEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.000001;
}
