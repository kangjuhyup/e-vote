import { Inject, Injectable } from '@nestjs/common';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import { DeleteElectionCommissionCommand } from '../dto/request/delete-election-commission.command';
import {
  ELECTION_COMMISSION_REPOSITORY_PORT,
  type ElectionCommissionRepositoryPort,
} from '../../port/persistence/command/election-commission-repository.port';
import { ElectionCommissionManagementAccess } from '../election-commission-management.access';

@Injectable()
export class DeleteElectionCommissionHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;
  constructor(
    @Inject(ELECTION_COMMISSION_REPOSITORY_PORT)
    private readonly repository: ElectionCommissionRepositoryPort,
    private readonly access: ElectionCommissionManagementAccess,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }
  @Transactional({ isolationLevel: 'serializable' })
  async execute(command: DeleteElectionCommissionCommand): Promise<void> {
    await this.access.requireAdmin(
      command.commissionId,
      command.userPrincipalId,
    );
    await this.repository.softDelete(command.commissionId, command.changedAt);
  }
}
