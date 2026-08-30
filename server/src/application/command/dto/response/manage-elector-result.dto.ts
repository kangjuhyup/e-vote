import type { ElectorStatus } from '../../../../domain/elector/type/elector-status.type';

export class ManageElectorResult {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly status: ElectorStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteId: string;
    readonly status: ElectorStatus;
  }): ManageElectorResult {
    return new ManageElectorResult(params.id, params.voteId, params.status);
  }
}
