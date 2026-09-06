import { ElectoralRollAggregate } from '../../../src/modules/electoral-roll/domain/electoral-roll.aggregate';
import { ElectoralRollMemberAggregate } from '../../../src/modules/electoral-roll/domain/electoral-roll-member.aggregate';
import {
  ElectoralRollSnapshotAggregate,
  ElectoralRollSnapshotMember,
} from '../../../src/modules/electoral-roll/domain/electoral-roll-snapshot.aggregate';
import { VoteAggregate } from '../../../src/modules/vote/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/shared/domain/voting/vo/vote-policy.vo';

describe('electoral roll domain', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  it('increments the source revision when roll members change', () => {
    const roll = ElectoralRollAggregate.create({
      id: 'roll-1',
      name: 'Members',
      createdAt: now,
    });

    roll.markMembersChanged(new Date('2026-08-30T01:00:00.000Z'));

    expect(roll).toMatchObject({
      revision: 2,
      updatedAt: new Date('2026-08-30T01:00:00.000Z'),
    });
  });

  it('validates source member identifiers and vote weights', () => {
    expect(() =>
      ElectoralRollMemberAggregate.create({
        id: 'member-1',
        electoralRollId: 'roll-1',
        identifier: ' ',
        voteWeight: 1,
        createdAt: now,
      }),
    ).toThrow('identifier must not be empty');
    expect(() =>
      ElectoralRollMemberAggregate.create({
        id: 'member-1',
        electoralRollId: 'roll-1',
        identifier: 'member-1',
        voteWeight: 0,
        createdAt: now,
      }),
    ).toThrow('voteWeight must be positive');
  });

  it('freezes snapshot members independently of later source mutations', () => {
    const source = ElectoralRollMemberAggregate.create({
      id: 'member-1',
      electoralRollId: 'roll-1',
      identifier: 'member-1',
      groupKey: 'group-1',
      voteWeight: 2,
      createdAt: now,
    });
    const snapshotMember = ElectoralRollSnapshotMember.of({
      id: 'snapshot-member-1',
      sourceMemberId: source.id,
      identifier: source.identifier,
      groupKey: source.groupKey,
      voteWeight: source.voteWeight,
      encryptedName: 'encrypted-name',
      encryptedPhoneNumber: 'encrypted-phone',
      encryptedBirthDate: 'encrypted-birth-date',
      identityNameHash: 'name-hash',
      identityPhoneNumberHash: 'phone-hash',
      identityBirthDateHash: 'birth-date-hash',
    });
    const snapshot = ElectoralRollSnapshotAggregate.create({
      id: 'snapshot-1',
      electoralRollId: 'roll-1',
      rollName: 'Members',
      sourceRevision: 1,
      contentHash: 'a'.repeat(64),
      members: [snapshotMember],
      createdAt: now,
    });

    source.update(
      { identifier: 'changed', voteWeight: 3 },
      new Date('2026-08-30T01:00:00.000Z'),
    );

    expect(snapshot.members[0]).toMatchObject({
      identifier: 'member-1',
      voteWeight: 2,
      identityNameHash: 'name-hash',
      identityPhoneNumberHash: 'phone-hash',
      identityBirthDateHash: 'birth-date-hash',
    });
    expect(snapshot.hasCompleteIdentityVerificationData()).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.members[0])).toBe(true);
  });

  it('allows snapshot attachment only while a vote is draft', () => {
    const vote = createVote();
    vote.attachElectoralRollSnapshot('snapshot-1');
    expect(vote.electoralRollSnapshotId).toBe('snapshot-1');

    const openVote = createVote(VoteStatus.Open);
    expect(() => openVote.attachElectoralRollSnapshot('snapshot-2')).toThrow(
      'only draft votes',
    );
  });

  it('rejects inconsistent vote weights inside one snapshot group', () => {
    const members = [1, 2].map((voteWeight, index) =>
      ElectoralRollSnapshotMember.of({
        id: `snapshot-member-${index + 1}`,
        sourceMemberId: `member-${index + 1}`,
        identifier: `member-${index + 1}`,
        groupKey: 'group-1',
        voteWeight,
      }),
    );

    expect(() =>
      ElectoralRollSnapshotAggregate.create({
        id: 'snapshot-1',
        electoralRollId: 'roll-1',
        rollName: 'Members',
        sourceRevision: 1,
        contentHash: 'a'.repeat(64),
        members,
        createdAt: now,
      }),
    ).toThrow('same group must have the same vote weight');
  });
});

function createVote(status = VoteStatus.Draft): VoteAggregate {
  return VoteAggregate.reconstitute({
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Vote',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
    startedAt: new Date('2026-08-09T00:00:00.000Z'),
    endedAt: new Date('2026-08-10T00:00:00.000Z'),
    status,
  });
}
