import { Inject, Injectable } from '@nestjs/common';
import { VOTE_READ_REPOSITORY_PORT } from '../../port/persistence/query/vote-read-repository.port';
import type { VoteReadRepositoryPort } from '../../port/persistence/query/vote-read-repository.port';
import { GetVotePageQuery } from '../dto/request/get-vote-page.query';
import type { VotePageView } from '../dto/response/vote.view';

@Injectable()
export class GetVotePageHandler {
  constructor(
    @Inject(VOTE_READ_REPOSITORY_PORT)
    private readonly voteReadRepository: VoteReadRepositoryPort,
  ) {}

  execute(query: GetVotePageQuery): Promise<VotePageView> {
    return this.voteReadRepository.findPage({
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
