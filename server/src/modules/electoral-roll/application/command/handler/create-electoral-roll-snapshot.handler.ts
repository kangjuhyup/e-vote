import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  ElectoralRollSnapshotAggregate,
  ElectoralRollSnapshotMember,
} from '../../../domain/electoral-roll-snapshot.aggregate';
import { CreateElectoralRollSnapshotCommand } from '../dto/request/create-electoral-roll-snapshot.command';
import { CreateElectoralRollSnapshotResult } from '../dto/response/create-electoral-roll-snapshot-result.dto';
import { ElectoralRollNotFoundError } from '../electoral-roll.error';
import {
  ELECTORAL_ROLL_REPOSITORY_PORT,
  type ElectoralRollRepositoryPort,
} from '../../port/persistence/command/electoral-roll-repository.port';
import {
  ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
  type ElectoralRollSnapshotRepositoryPort,
} from '../../port/persistence/command/electoral-roll-snapshot-repository.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';

@Injectable()
export class CreateElectoralRollSnapshotHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(ELECTORAL_ROLL_REPOSITORY_PORT)
    private readonly electoralRollRepository: ElectoralRollRepositoryPort,
    @Inject(ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT)
    private readonly snapshotRepository: ElectoralRollSnapshotRepositoryPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: CreateElectoralRollSnapshotCommand,
  ): Promise<CreateElectoralRollSnapshotResult> {
    const electoralRoll = await this.electoralRollRepository.findById(
      command.electoralRollId,
    );
    if (!electoralRoll) throw new ElectoralRollNotFoundError();

    const existing = await this.snapshotRepository.findBySourceRevision(
      electoralRoll.id,
      electoralRoll.revision,
    );
    if (existing) return toSnapshotResult(existing);

    const sourceMembers = [
      ...(await this.electoralRollRepository.findMembersByRollId(
        electoralRoll.id,
      )),
    ].sort(
      (a, b) =>
        compareCanonical(a.identifier, b.identifier) ||
        compareCanonical(a.id, b.id),
    );
    const contentHash = createHash('sha256')
      .update(
        JSON.stringify(
          sourceMembers.map((member) => ({
            identifier: member.identifier,
            groupKey: member.groupKey ?? '',
            voteWeight: member.voteWeight,
          })),
        ),
      )
      .digest('hex');
    const members = sourceMembers.map((member) =>
      ElectoralRollSnapshotMember.of({
        id: this.snapshotRepository.nextMemberId(),
        sourceMemberId: member.id,
        identifier: member.identifier,
        groupKey: member.groupKey,
        voteWeight: member.voteWeight,
      }),
    );
    const snapshot = ElectoralRollSnapshotAggregate.create({
      id: this.snapshotRepository.nextId(),
      electoralRollId: electoralRoll.id,
      commissionId: electoralRoll.commissionId,
      rollName: electoralRoll.name,
      sourceRevision: electoralRoll.revision,
      contentHash,
      members,
      createdAt: command.createdAt,
    });
    await this.snapshotRepository.save(snapshot);

    return toSnapshotResult(snapshot);
  }
}

function compareCanonical(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function toSnapshotResult(
  snapshot: ElectoralRollSnapshotAggregate,
): CreateElectoralRollSnapshotResult {
  return CreateElectoralRollSnapshotResult.of({
    id: snapshot.id,
    electoralRollId: snapshot.electoralRollId,
    sourceRevision: snapshot.sourceRevision,
    memberCount: snapshot.memberCount,
    contentHash: snapshot.contentHash,
    createdAt: snapshot.createdAt,
  });
}
