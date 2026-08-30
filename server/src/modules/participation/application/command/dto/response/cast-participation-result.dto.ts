import type { ParticipationStatus } from '../../../../../../shared/domain/voting/type/participation-status.type';

export class CastParticipationResult {
  private constructor(
    readonly id: string,
    readonly voteDetailId: string,
    readonly status: ParticipationStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteDetailId: string;
    readonly status: ParticipationStatus;
  }): CastParticipationResult {
    return new CastParticipationResult(
      params.id,
      params.voteDetailId,
      params.status,
    );
  }
}
