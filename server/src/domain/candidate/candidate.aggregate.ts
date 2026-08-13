import { DomainError } from '../shared/domain-error';
import { assertPositiveNumber, createId } from '../shared/id';
import { CandidateStatus } from './type/candidate-status.type';

interface CreateCandidateParams {
  readonly id: string;
  readonly voteDetailId: string;
  readonly candidateNo: number;
  readonly name: string;
  readonly status?: CandidateStatus;
}

type ReconstituteCandidateParams = Required<CreateCandidateParams>;

export class CandidateAggregate {
  private constructor(
    readonly id: string,
    readonly voteDetailId: string,
    readonly candidateNo: number,
    readonly name: string,
    public status: CandidateStatus,
  ) {}

  static create(params: CreateCandidateParams): CandidateAggregate {
    const id = createId(params.id);
    const voteDetailId = createId(params.voteDetailId);
    const name = params.name.trim();

    if (name.length === 0) {
      throw new DomainError('candidate name must not be empty');
    }

    assertPositiveNumber(params.candidateNo, 'candidateNo');

    if (!Number.isInteger(params.candidateNo)) {
      throw new DomainError('candidateNo must be an integer');
    }

    return new CandidateAggregate(
      id,
      voteDetailId,
      params.candidateNo,
      name,
      params.status ?? CandidateStatus.Active,
    );
  }

  static reconstitute(params: ReconstituteCandidateParams): CandidateAggregate {
    return CandidateAggregate.create(params);
  }

  withdraw(): void {
    if (this.status === CandidateStatus.Withdrawn) {
      throw new DomainError('candidate is already withdrawn');
    }

    this.status = CandidateStatus.Withdrawn;
  }
}
