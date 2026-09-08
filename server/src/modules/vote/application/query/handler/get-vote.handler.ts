import { Inject, Injectable } from '@nestjs/common';
import { VOTE_READ_REPOSITORY_PORT } from '../../port/persistence/query/vote-read-repository.port';
import type { VoteReadRepositoryPort } from '../../port/persistence/query/vote-read-repository.port';
import { GetVoteQuery } from '../dto/request/get-vote.query';
import type { VoteView } from '../dto/response/vote.view';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';

export class VoteNotFoundError extends Error {
  constructor() {
    super('vote not found');
  }
}

@Injectable()
export class GetVoteHandler {
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
  async execute(query: GetVoteQuery): Promise<VoteView> {
    const vote = await this.voteReadRepository.findDetailById({
      voteId: query.voteId,
      userPrincipalId: query.userPrincipalId,
      ...(query.tenantId
        ? {
            tenantId: query.tenantId,
            organizationGroupIds: query.organizationGroupIds,
            voteAdmin: query.voteAdmin,
          }
        : {}),
    });

    if (!vote) {
      throw new VoteNotFoundError();
    }

    return vote;
  }
}
