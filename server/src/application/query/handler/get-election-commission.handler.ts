import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_COMMISSION_READ_REPOSITORY_PORT,
  type ElectionCommissionReadRepositoryPort,
} from '../../port/persistence/query/election-commission-read-repository.port';
import { GetElectionCommissionQuery } from '../dto/request/get-election-commission.query';
import type { ElectionCommissionView } from '../dto/response/election-commission.view';

export class ElectionCommissionNotFoundError extends Error {
  constructor() {
    super('election commission not found');
  }
}

@Injectable()
export class GetElectionCommissionHandler {
  constructor(
    @Inject(ELECTION_COMMISSION_READ_REPOSITORY_PORT)
    private readonly repository: ElectionCommissionReadRepositoryPort,
  ) {}

  async execute(
    query: GetElectionCommissionQuery,
  ): Promise<ElectionCommissionView> {
    const commission = await this.repository.findDetailById(query.commissionId);

    if (!commission) {
      throw new ElectionCommissionNotFoundError();
    }

    return commission;
  }
}
