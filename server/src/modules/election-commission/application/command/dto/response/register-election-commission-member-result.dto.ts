import type { ElectionCommissionMemberStatus } from '../../../../domain/type/election-commission-member-status.type';

export class RegisterElectionCommissionMemberResult {
  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly status: ElectionCommissionMemberStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly commissionId: string;
    readonly status: ElectionCommissionMemberStatus;
  }): RegisterElectionCommissionMemberResult {
    return new RegisterElectionCommissionMemberResult(
      params.id,
      params.commissionId,
      params.status,
    );
  }
}
