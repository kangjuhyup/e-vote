import { Inject, Injectable } from '@nestjs/common';
import { ElectoralRollAggregate } from '../../../domain/electoral-roll.aggregate';
import { CreateElectoralRollCommand } from '../dto/request/create-electoral-roll.command';
import { CreateElectoralRollResult } from '../dto/response/create-electoral-roll-result.dto';
import {
  ELECTORAL_ROLL_REPOSITORY_PORT,
  type ElectoralRollRepositoryPort,
} from '../../port/persistence/command/electoral-roll-repository.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import { ElectoralRollSnapshotCreator } from '../electoral-roll-snapshot.creator';

@Injectable()
export class CreateElectoralRollHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(ELECTORAL_ROLL_REPOSITORY_PORT)
    private readonly electoralRollRepository: ElectoralRollRepositoryPort,
    private readonly snapshotCreator: ElectoralRollSnapshotCreator,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: CreateElectoralRollCommand,
  ): Promise<CreateElectoralRollResult> {
    const electoralRoll = ElectoralRollAggregate.create({
      id: this.electoralRollRepository.nextId(),
      name: command.name,
      createdAt: command.createdAt,
    });
    await this.electoralRollRepository.create(
      electoralRoll,
      command.userPrincipalId,
    );
    await this.snapshotCreator.createForCurrentRevision(
      electoralRoll,
      command.createdAt,
    );

    return CreateElectoralRollResult.of({
      id: electoralRoll.id,
      name: electoralRoll.name,
      revision: electoralRoll.revision,
    });
  }
}
