import { Inject, Injectable } from '@nestjs/common';
import { VOTE_READ_REPOSITORY_PORT } from '../../port/persistence/query/vote-read-repository.port';
import type { VoteReadRepositoryPort } from '../../port/persistence/query/vote-read-repository.port';
import { GetVotePageQuery } from '../dto/request/get-vote-page.query';
import type { VotePageView } from '../dto/response/vote.view';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';

@Injectable()
export class GetVotePageHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_READ_REPOSITORY_PORT)
    private readonly voteReadRepository: VoteReadRepositoryPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'repeatable-read' })
  async execute(query: GetVotePageQuery): Promise<VotePageView> {
    return this.voteReadRepository.findPage({
      page: query.page,
      pageSize: query.pageSize,
      userPrincipalId: query.userPrincipalId,
    });
  }
}
