import { Inject, Injectable } from '@nestjs/common';
import { VOTE_READ_REPOSITORY_PORT } from '../port/vote-read-repository.port';
import type { VoteReadRepositoryPort } from '../port/vote-read-repository.port';
import { GetVoteQuery } from './get-vote.query';
import type { VoteView } from './vote.view';

export class VoteNotFoundError extends Error {
  constructor() {
    super('vote not found');
  }
}

@Injectable()
export class GetVoteHandler {
  constructor(
    @Inject(VOTE_READ_REPOSITORY_PORT)
    private readonly voteReadRepository: VoteReadRepositoryPort,
  ) {}

  async execute(query: GetVoteQuery): Promise<VoteView> {
    const vote = await this.voteReadRepository.findDetailById(query.voteId);

    if (!vote) {
      throw new VoteNotFoundError();
    }

    return vote;
  }
}
