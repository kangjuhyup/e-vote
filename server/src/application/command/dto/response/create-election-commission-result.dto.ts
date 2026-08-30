import type { ElectionCommissionStatus } from '../../../../domain/election-commission/type/election-commission-status.type';

export class CreateElectionCommissionResult {
  private constructor(
    readonly id: string,
    readonly status: ElectionCommissionStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly status: ElectionCommissionStatus;
  }): CreateElectionCommissionResult {
    return new CreateElectionCommissionResult(params.id, params.status);
  }
}
