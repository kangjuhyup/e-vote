import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_COMMISSION_READ_REPOSITORY_PORT,
  type ElectionCommissionReadRepositoryPort,
} from '../../port/persistence/query/election-commission-read-repository.port';
import { GetElectionCommissionPageQuery } from '../get-election-commission-page.query';
import type { ElectionCommissionPageView } from '../view/election-commission.view';

@Injectable()
export class GetElectionCommissionPageHandler {
  constructor(
    @Inject(ELECTION_COMMISSION_READ_REPOSITORY_PORT)
    private readonly repository: ElectionCommissionReadRepositoryPort,
  ) {}

  execute(
    query: GetElectionCommissionPageQuery,
  ): Promise<ElectionCommissionPageView> {
    return this.repository.findPage({
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
