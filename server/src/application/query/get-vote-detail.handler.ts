import { Inject, Injectable } from '@nestjs/common';
import { VOTE_DETAIL_READ_REPOSITORY_PORT } from '../port/vote-detail-read-repository.port';
import type { VoteDetailReadRepositoryPort } from '../port/vote-detail-read-repository.port';
import { GetVoteDetailQuery } from './get-vote-detail.query';
import type { VoteDetailReadView } from './vote-detail-read.view';

export class VoteDetailNotFoundError extends Error {
  constructor() {
    super('vote detail not found');
  }
}

@Injectable()
export class GetVoteDetailHandler {
  constructor(
    @Inject(VOTE_DETAIL_READ_REPOSITORY_PORT)
    private readonly voteDetailReadRepository: VoteDetailReadRepositoryPort,
  ) {}

  async execute(query: GetVoteDetailQuery): Promise<VoteDetailReadView> {
    const voteDetail = await this.voteDetailReadRepository.findDetailById(
      query.voteId,
      query.voteDetailId,
    );

    if (!voteDetail) {
      throw new VoteDetailNotFoundError();
    }

    return voteDetail;
  }
}
