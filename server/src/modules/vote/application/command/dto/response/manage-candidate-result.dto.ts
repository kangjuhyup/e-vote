import type { CandidateStatus } from '../../../../../../shared/domain/voting/type/candidate-status.type';

export class ManageCandidateResult {
  private constructor(
    readonly id: string,
    readonly voteDetailId: string,
    readonly status: CandidateStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteDetailId: string;
    readonly status: CandidateStatus;
  }): ManageCandidateResult {
    return new ManageCandidateResult(
      params.id,
      params.voteDetailId,
      params.status,
    );
  }
}
