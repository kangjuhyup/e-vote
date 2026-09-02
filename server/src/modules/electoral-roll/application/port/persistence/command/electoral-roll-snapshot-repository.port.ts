import type { ElectoralRollSnapshotAggregate } from '../../../../domain/electoral-roll-snapshot.aggregate';

export const ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT = Symbol(
  'ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT',
);

export interface ElectoralRollSnapshotRepositoryPort {
  nextId(): string;
  nextMemberId(): string;
  findBySourceRevision(
    electoralRollId: string,
    sourceRevision: number,
  ): Promise<ElectoralRollSnapshotAggregate | undefined>;
  save(snapshot: ElectoralRollSnapshotAggregate): Promise<void>;
  hasVoteElectors(voteId: string): Promise<boolean>;
  materializeVoteElectors(voteId: string, snapshotId: string): Promise<void>;
}
