import type { ElectionCommissionMemberRole } from '../../../../domain/type/election-commission-member-role.type';

export class RegisterElectionCommissionMemberCommand {
  private constructor(
    readonly commissionId: string,
    readonly userPrincipalId: string,
    readonly name: string,
    readonly role: ElectionCommissionMemberRole,
    readonly registeredAt: Date,
  ) {}

  static of(params: {
    commissionId: string;
    userPrincipalId: string;
    name: string;
    role: ElectionCommissionMemberRole;
    registeredAt: Date;
  }): RegisterElectionCommissionMemberCommand {
    return new RegisterElectionCommissionMemberCommand(
      params.commissionId,
      params.userPrincipalId,
      params.name,
      params.role,
      params.registeredAt,
    );
  }
}
