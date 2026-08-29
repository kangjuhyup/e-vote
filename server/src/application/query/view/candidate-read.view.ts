import type { CandidateStatus } from '../../../domain/candidate/type/candidate-status.type';

export type CandidateReadViewProps = {
  readonly id: string;
  readonly voteId: string;
  readonly voteDetailId: string;
  readonly candidateNo: number;
  readonly name: string;
  readonly description: string;
  readonly status: CandidateStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class CandidateReadView {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly candidateNo: number,
    readonly name: string,
    readonly description: string,
    readonly status: CandidateStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static of(params: CandidateReadViewProps): CandidateReadView {
    return new CandidateReadView(
      params.id,
      params.voteId,
      params.voteDetailId,
      params.candidateNo,
      params.name,
      params.description,
      params.status,
      params.createdAt,
      params.updatedAt,
    );
  }
}

export type CandidatePageReadViewProps = {
  readonly items: readonly CandidateReadView[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class CandidatePageReadView {
  private constructor(
    readonly items: readonly CandidateReadView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {}

  static of(params: CandidatePageReadViewProps): CandidatePageReadView {
    return new CandidatePageReadView(
      params.items,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}
