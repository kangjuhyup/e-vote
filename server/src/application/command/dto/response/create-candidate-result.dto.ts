import type { CandidateStatus } from '../../../../domain/candidate/type/candidate-status.type';

export class CreateCandidateResult {
  private constructor(
    readonly id: string,
    readonly voteDetailId: string,
    readonly status: CandidateStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteDetailId: string;
    readonly status: CandidateStatus;
  }): CreateCandidateResult {
    return new CreateCandidateResult(
      params.id,
      params.voteDetailId,
      params.status,
    );
  }
}
