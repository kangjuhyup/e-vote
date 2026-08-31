import type {
  ElectoralRollMemberRecord,
  ElectoralRollRecord,
} from "../model/electoral-roll.types";

export interface MockElectoralRollSnapshot {
  contentHash: string;
  createdAt: string;
  electoralRollId: string;
  id: string;
  memberCount: number;
  sourceRevision: number;
  members: Array<
    Pick<
      ElectoralRollMemberRecord,
      "groupKey" | "identifier" | "voteWeight"
    >
  >;
}

export function createElectoralRollFixtures() {
  const rolls: ElectoralRollRecord[] = [
    {
      id: "electoral-roll-1",
      commissionId: "commission-1",
      name: "2026 상반기 선거인명부",
      revision: 2,
      members: [
        {
          id: "electoral-roll-member-1",
          electoralRollId: "electoral-roll-1",
          identifier: "member-101",
          groupKey: "운영팀",
          voteWeight: 1,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-02T00:00:00.000Z",
        },
        {
          id: "electoral-roll-member-2",
          electoralRollId: "electoral-roll-1",
          identifier: "member-102",
          groupKey: "재무팀",
          voteWeight: 1,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-02T00:00:00.000Z",
        },
      ],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    },
  ];

  const initialRoll = rolls[0];
  const snapshots: MockElectoralRollSnapshot[] = [
    {
      id: "electoral-roll-snapshot-1",
      electoralRollId: initialRoll.id,
      sourceRevision: initialRoll.revision,
      memberCount: initialRoll.members.length,
      contentHash: `mock-hash-${initialRoll.id}-${initialRoll.revision}`,
      createdAt: initialRoll.updatedAt,
      members: initialRoll.members.map(
        ({ groupKey, identifier, voteWeight }) => ({
          groupKey,
          identifier,
          voteWeight,
        }),
      ),
    },
  ];

  return { rolls, snapshots };
}

export const electoralRollMockState = createElectoralRollFixtures();

export function findLatestMockElectoralRollSnapshot(electoralRollId: string) {
  return electoralRollMockState.snapshots
    .filter((snapshot) => snapshot.electoralRollId === electoralRollId)
    .sort(
      (a, b) =>
        b.sourceRevision - a.sourceRevision ||
        b.createdAt.localeCompare(a.createdAt),
    )[0];
}
