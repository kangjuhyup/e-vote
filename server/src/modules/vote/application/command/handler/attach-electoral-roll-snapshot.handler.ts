import { Inject, Injectable } from '@nestjs/common';
import { AttachElectoralRollSnapshotCommand } from '../dto/request/attach-electoral-roll-snapshot.command';
import { AttachElectoralRollSnapshotResult } from '../dto/response/attach-electoral-roll-snapshot-result.dto';
import {
  ElectoralRollSnapshotSourceNotFoundError,
  ElectoralRollIdentityVerificationDataRequiredError,
  VoteElectorsAlreadyExistError,
} from '../electoral-roll-snapshot-attachment.error';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import {
  ELECTORAL_ROLL_SNAPSHOT_ACCESS_PORT,
  type ElectoralRollSnapshotAccessPort,
} from '../../../../../shared/application/port/capability/electoral-roll-snapshot-access.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  type VoteSetupLifecyclePort,
} from '../../../../../shared/application/port/capability/vote-billing.port';

@Injectable()
export class AttachElectoralRollSnapshotHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(ELECTORAL_ROLL_SNAPSHOT_ACCESS_PORT)
    private readonly snapshotRepository: ElectoralRollSnapshotAccessPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: AttachElectoralRollSnapshotCommand,
  ): Promise<AttachElectoralRollSnapshotResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const vote = await this.voteRepository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');

    const snapshot = await this.snapshotRepository.resolveCurrent(
      command.electoralRollId,
      command.userPrincipalId,
      command.requestedAt,
    );
    if (!snapshot) throw new ElectoralRollSnapshotSourceNotFoundError();

    if (
      vote.identityVerificationPolicy.required &&
      !snapshot.hasCompleteIdentityVerificationData()
    ) {
      throw new ElectoralRollIdentityVerificationDataRequiredError();
    }

    if (vote.usesElectoralRollSnapshot(snapshot.id)) {
      return AttachElectoralRollSnapshotResult.of({
        voteId: vote.id,
        snapshotId: snapshot.id,
        memberCount: snapshot.memberCount,
      });
    }

    if (
      !vote.hasElectoralRollSnapshot() &&
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
