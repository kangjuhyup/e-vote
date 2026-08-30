import { Inject, Injectable } from '@nestjs/common';
import { AttachElectoralRollSnapshotCommand } from '../dto/request/attach-electoral-roll-snapshot.command';
import { AttachElectoralRollSnapshotResult } from '../dto/response/attach-electoral-roll-snapshot-result.dto';
import {
  ElectoralRollCommissionMismatchError,
  ElectoralRollSnapshotNotFoundError,
  VoteElectorsAlreadyExistError,
} from '../electoral-roll.error';
import { ManagedResourceNotFoundError } from '../vote-management.error';
import {
  ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
  type ElectoralRollSnapshotRepositoryPort,
} from '../../port/persistence/command/electoral-roll-snapshot-repository.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../persistence/transaction/transactional.decorator';

@Injectable()
export class AttachElectoralRollSnapshotHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT)
    private readonly snapshotRepository: ElectoralRollSnapshotRepositoryPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: AttachElectoralRollSnapshotCommand,
  ): Promise<AttachElectoralRollSnapshotResult> {
    const vote = await this.voteRepository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');

    const snapshot = await this.snapshotRepository.findById(command.snapshotId);
    if (!snapshot) throw new ElectoralRollSnapshotNotFoundError();
    if (snapshot.commissionId !== vote.commissionId) {
      throw new ElectoralRollCommissionMismatchError();
    }

    if (vote.electoralRollSnapshotId === snapshot.id) {
      return AttachElectoralRollSnapshotResult.of({
        voteId: vote.id,
        snapshotId: snapshot.id,
        memberCount: snapshot.memberCount,
      });
    }

    if (
      vote.electoralRollSnapshotId === undefined &&
      (await this.snapshotRepository.hasVoteElectors(vote.id))
    ) {
      throw new VoteElectorsAlreadyExistError();
    }

    vote.attachElectoralRollSnapshot(snapshot.id);
    await this.voteRepository.save(vote);
    await this.snapshotRepository.materializeVoteElectors(vote.id, snapshot.id);

    return AttachElectoralRollSnapshotResult.of({
      voteId: vote.id,
      snapshotId: snapshot.id,
      memberCount: snapshot.memberCount,
    });
  }
}
