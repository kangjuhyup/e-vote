import { Inject, Injectable } from '@nestjs/common';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import { RemoveElectionCommissionMemberCommand } from '../dto/request/remove-election-commission-member.command';
import {
  ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT,
  type ElectionCommissionMemberRepositoryPort,
} from '../../port/persistence/command/election-commission-member-repository.port';
import { ElectionCommissionManagementAccess } from '../election-commission-management.access';
import {
  ElectionCommissionManagementNotFoundError,
  LastElectionCommissionAdminError,
} from '../election-commission-management.error';
@Injectable()
export class RemoveElectionCommissionMemberHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;
  constructor(
    @Inject(ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT)
    private readonly repository: ElectionCommissionMemberRepositoryPort,
    private readonly access: ElectionCommissionManagementAccess,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }
  @Transactional({ isolationLevel: 'serializable' })
  async execute(command: RemoveElectionCommissionMemberCommand): Promise<void> {
    const admins = await this.access.requireAdmin(
      command.commissionId,
      command.userPrincipalId,
    );
    const [member] = await this.repository.findByIds(command.commissionId, [
      command.memberId,
    ]);
    if (!member) throw new ElectionCommissionManagementNotFoundError();
    if (admins.some((admin) => admin.id === member.id) && admins.length === 1)
      throw new LastElectionCommissionAdminError();
    member.deactivate(command.changedAt);
    await this.repository.save(member);
  }
}
