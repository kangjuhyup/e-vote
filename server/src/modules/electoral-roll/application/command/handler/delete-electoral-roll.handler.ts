import { Inject, Injectable } from '@nestjs/common';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import { DeleteElectoralRollCommand } from '../dto/request/delete-electoral-roll.command';
import {
  ELECTORAL_ROLL_REPOSITORY_PORT,
  type ElectoralRollRepositoryPort,
} from '../../port/persistence/command/electoral-roll-repository.port';
import { ElectoralRollNotFoundError } from '../electoral-roll.error';
@Injectable()
export class DeleteElectoralRollHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;
  constructor(
    @Inject(ELECTORAL_ROLL_REPOSITORY_PORT)
    private readonly repository: ElectoralRollRepositoryPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }
  @Transactional({ isolationLevel: 'serializable' })
  async execute(command: DeleteElectoralRollCommand): Promise<void> {
    const roll = await this.repository.findById(
      command.electoralRollId,
      command.userPrincipalId,
    );
    if (!roll) throw new ElectoralRollNotFoundError();
    await this.repository.softDelete(roll.id, command.changedAt);
  }
}
