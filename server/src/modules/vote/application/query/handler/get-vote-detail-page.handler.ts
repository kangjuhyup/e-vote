import { Inject, Injectable } from '@nestjs/common';
import { VOTE_DETAIL_READ_REPOSITORY_PORT } from '../../port/persistence/query/vote-detail-read-repository.port';
import type { VoteDetailReadRepositoryPort } from '../../port/persistence/query/vote-detail-read-repository.port';
import { GetVoteDetailPageQuery } from '../dto/request/get-vote-detail-page.query';
import type { VoteDetailPageReadView } from '../dto/response/vote-detail-read.view';

@Injectable()
export class GetVoteDetailPageHandler {
  constructor(
    @Inject(VOTE_DETAIL_READ_REPOSITORY_PORT)
    private readonly voteDetailReadRepository: VoteDetailReadRepositoryPort,
  ) {}

  execute(query: GetVoteDetailPageQuery): Promise<VoteDetailPageReadView> {
    return this.voteDetailReadRepository.findPage({
      voteId: query.voteId,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
