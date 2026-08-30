import { CandidateAggregate } from '../../../domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../../../shared/domain/voting/type/candidate-status.type';
import { EntityRelationReference } from '../../../../../platform/database/mapper/mapper-relation.type';

export type CandidatePersistence = {
  readonly id: string;
  readonly voteDetail: EntityRelationReference;
  readonly candidateNo: number;
  readonly name: string;
  readonly status: CandidateStatus;
};

export class CandidateMapper {
  static toDomain(entity: CandidatePersistence): CandidateAggregate {
    return CandidateAggregate.reconstitute({
      id: entity.id,
      voteDetailId: entity.voteDetail.id,
      candidateNo: entity.candidateNo,
      name: entity.name,
      status: entity.status,
    });
  }
}
