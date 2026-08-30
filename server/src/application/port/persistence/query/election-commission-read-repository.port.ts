import type {
  ElectionCommissionPageView,
  ElectionCommissionView,
} from '../../../query/dto/response/election-commission.view';

export const ELECTION_COMMISSION_READ_REPOSITORY_PORT = Symbol(
  'ELECTION_COMMISSION_READ_REPOSITORY_PORT',
);

export interface ElectionCommissionReadRepositoryPort {
  findDetailById(
    commissionId: string,
  ): Promise<ElectionCommissionView | undefined>;
  findPage(request: {
    readonly page: number;
    readonly pageSize: number;
  }): Promise<ElectionCommissionPageView>;
}
