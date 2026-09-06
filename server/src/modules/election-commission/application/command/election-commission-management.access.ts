import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_COMMISSION_REPOSITORY_PORT,
  type ElectionCommissionRepositoryPort,
} from '../port/persistence/command/election-commission-repository.port';
import {
  ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT,
  type ElectionCommissionMemberRepositoryPort,
} from '../port/persistence/command/election-commission-member-repository.port';
import {
  ElectionCommissionAdminRequiredError,
  ElectionCommissionManagementNotFoundError,
} from './election-commission-management.error';
@Injectable()
export class ElectionCommissionManagementAccess {
  constructor(
    @Inject(ELECTION_COMMISSION_REPOSITORY_PORT)
    private readonly commissions: ElectionCommissionRepositoryPort,
    @Inject(ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT)
    private readonly members: ElectionCommissionMemberRepositoryPort,
  ) {}
  async requireAdmin(commissionId: string, userPrincipalId: string) {
    const commission = await this.commissions.findById(commissionId);
    if (!commission) throw new ElectionCommissionManagementNotFoundError();
    const admins = await this.members.findActiveAdmins(commissionId);
    if (
      !commission.canRunVote() ||
      !admins.some((member) => member.userPrincipalId === userPrincipalId)
    )
      throw new ElectionCommissionAdminRequiredError();
    return admins;
  }
}
