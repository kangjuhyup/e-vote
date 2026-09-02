import type { ElectoralRollSnapshotReference } from '../../../domain/voting/capability-reference';

export const ELECTORAL_ROLL_SNAPSHOT_ACCESS_PORT = Symbol(
  'ELECTORAL_ROLL_SNAPSHOT_ACCESS_PORT',
);

export interface ElectoralRollSnapshotAccessPort {
  resolveCurrent(
    electoralRollId: string,
    userPrincipalId: string,
    createdAt: Date,
  ): Promise<ElectoralRollSnapshotReference | undefined>;
  hasVoteElectors(voteId: string): Promise<boolean>;
  materializeVoteElectors(voteId: string, snapshotId: string): Promise<void>;
}
