import type {
  ElectoralRollMemberRecord,
  ElectoralRollRecord,
} from '../model/electoral-roll.types';

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
      | 'birthDate'
      | 'groupKey'
      | 'identifier'
      | 'name'
      | 'phoneNumber'
      | 'voteWeight'
    >
  >;
}

export function createElectoralRollFixtures() {
  const rolls: ElectoralRollRecord[] = [
    {
      id: 'electoral-roll-1',
      name: '2026 상반기 선거인명부',
      revision: 2,
      members: [
        {
          id: 'electoral-roll-member-1',
          electoralRollId: 'electoral-roll-1',
          identifier: 'member-101',
          name: '김대표',
          phoneNumber: '010-1234-1201',
          birthDate: '1990-01-31',
          groupKey: '운영팀',
          voteWeight: 1,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-02T00:00:00.000Z',
        },
        {
          id: 'electoral-roll-member-2',
          electoralRollId: 'electoral-roll-1',
          identifier: 'member-102',
          groupKey: '재무팀',
          voteWeight: 1,
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-02T00:00:00.000Z',
        },
      ],
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    },
  ];

  const initialRoll = rolls[0];
  const snapshots: MockElectoralRollSnapshot[] = [
    {
      id: 'electoral-roll-snapshot-1',
      electoralRollId: initialRoll.id,
      sourceRevision: initialRoll.revision,
      memberCount: initialRoll.members.length,
      contentHash: `mock-hash-${initialRoll.id}-${initialRoll.revision}`,
      createdAt: initialRoll.updatedAt,
      members: initialRoll.members.map(
        ({ birthDate, groupKey, identifier, name, phoneNumber, voteWeight }) => ({
          birthDate,
          groupKey,
          identifier,
          name,
          phoneNumber,
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

export function resolveCurrentMockElectoralRollSnapshot(
  electoralRollId: string,
) {
  const roll = electoralRollMockState.rolls.find(
    (item) => item.id === electoralRollId,
  );
  if (!roll) return undefined;

  const existing = electoralRollMockState.snapshots.find(
    (snapshot) =>
      snapshot.electoralRollId === electoralRollId &&
      snapshot.sourceRevision === roll.revision,
  );
  if (existing) return existing;

  const snapshot: MockElectoralRollSnapshot = {
    id: `electoral-roll-snapshot-${electoralRollId}-${roll.revision}`,
    electoralRollId,
    sourceRevision: roll.revision,
    memberCount: roll.members.length,
    contentHash: `mock-hash-${electoralRollId}-${roll.revision}`,
    createdAt: roll.updatedAt,
    members: roll.members.map(
      ({ birthDate, groupKey, identifier, name, phoneNumber, voteWeight }) => ({
        birthDate,
        groupKey,
        identifier,
        name,
        phoneNumber,
        voteWeight,
      }),
    ),
  };
  electoralRollMockState.snapshots.push(snapshot);
  return snapshot;
}
