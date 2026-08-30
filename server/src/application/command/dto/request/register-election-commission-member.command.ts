import type { ElectionCommissionMemberRole } from '../../../../domain/election-commission/type/election-commission-member-role.type';

export class RegisterElectionCommissionMemberCommand {
  private constructor(
    readonly commissionId: string,
    readonly name: string,
    readonly role: ElectionCommissionMemberRole,
    readonly registeredAt: Date,
  ) {}

  static of(params: {
    commissionId: string;
    name: string;
    role: ElectionCommissionMemberRole;
    registeredAt: Date;
  }): RegisterElectionCommissionMemberCommand {
    return new RegisterElectionCommissionMemberCommand(
      params.commissionId,
      params.name,
      params.role,
      params.registeredAt,
    );
  }
}
