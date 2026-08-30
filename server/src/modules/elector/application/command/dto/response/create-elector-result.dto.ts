import type { ElectorStatus } from '../../../../../../shared/domain/voting/type/elector-status.type';

export class CreateElectorResult {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly name: string,
    readonly phoneNumber: string | undefined,
    readonly birthDate: string | undefined,
    readonly status: ElectorStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteId: string;
    readonly name: string;
    readonly phoneNumber?: string;
    readonly birthDate?: string;
    readonly status: ElectorStatus;
  }): CreateElectorResult {
    return new CreateElectorResult(
      params.id,
      params.voteId,
      params.name,
      params.phoneNumber,
      params.birthDate,
      params.status,
    );
  }
}
