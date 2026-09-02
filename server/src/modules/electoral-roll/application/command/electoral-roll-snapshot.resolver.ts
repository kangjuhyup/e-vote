import { Inject, Injectable } from '@nestjs/common';
import type { ElectoralRollSnapshotAccessPort } from '../../../../shared/application/port/capability/electoral-roll-snapshot-access.port';
import type { ElectoralRollSnapshotReference } from '../../../../shared/domain/voting/capability-reference';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  ELECTORAL_ROLL_REPOSITORY_PORT,
  type ElectoralRollRepositoryPort,
} from '../port/persistence/command/electoral-roll-repository.port';
import {
  ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
  type ElectoralRollSnapshotRepositoryPort,
} from '../port/persistence/command/electoral-roll-snapshot-repository.port';
import { ElectoralRollSnapshotCreator } from './electoral-roll-snapshot.creator';

@Injectable()
export class ElectoralRollSnapshotResolver implements ElectoralRollSnapshotAccessPort {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(ELECTORAL_ROLL_REPOSITORY_PORT)
    private readonly electoralRollRepository: ElectoralRollRepositoryPort,
    @Inject(ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT)
    private readonly snapshotRepository: ElectoralRollSnapshotRepositoryPort,
    private readonly snapshotCreator: ElectoralRollSnapshotCreator,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async resolveCurrent(
    electoralRollId: string,
    userPrincipalId: string,
    createdAt: Date,
  ): Promise<ElectoralRollSnapshotReference | undefined> {
    const electoralRoll = await this.electoralRollRepository.findById(
      electoralRollId,
      userPrincipalId,
    );
    if (!electoralRoll) return undefined;

    return this.snapshotCreator.createForCurrentRevision(
      electoralRoll,
      createdAt,
    );
  }

  hasVoteElectors(voteId: string): Promise<boolean> {
    return this.snapshotRepository.hasVoteElectors(voteId);
  }

  materializeVoteElectors(voteId: string, snapshotId: string): Promise<void> {
    return this.snapshotRepository.materializeVoteElectors(voteId, snapshotId);
  }
}
