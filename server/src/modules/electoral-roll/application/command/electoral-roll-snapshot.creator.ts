import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { ElectoralRollAggregate } from '../../domain/electoral-roll.aggregate';
import {
  ElectoralRollSnapshotAggregate,
  ElectoralRollSnapshotMember,
} from '../../domain/electoral-roll-snapshot.aggregate';
import {
  ELECTORAL_ROLL_REPOSITORY_PORT,
  type ElectoralRollRepositoryPort,
} from '../port/persistence/command/electoral-roll-repository.port';
import {
  ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
  type ElectoralRollSnapshotRepositoryPort,
} from '../port/persistence/command/electoral-roll-snapshot-repository.port';

@Injectable()
export class ElectoralRollSnapshotCreator {
  constructor(
    @Inject(ELECTORAL_ROLL_REPOSITORY_PORT)
    private readonly electoralRollRepository: ElectoralRollRepositoryPort,
    @Inject(ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT)
    private readonly snapshotRepository: ElectoralRollSnapshotRepositoryPort,
  ) {}

  async createForCurrentRevision(
    electoralRoll: ElectoralRollAggregate,
    createdAt: Date,
  ): Promise<ElectoralRollSnapshotAggregate> {
    const existing = await this.snapshotRepository.findBySourceRevision(
      electoralRoll.id,
      electoralRoll.revision,
    );
    if (existing) return existing;

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
      createdAt,
    });
    await this.snapshotRepository.save(snapshot);

    return snapshot;
  }
}

function compareCanonical(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
