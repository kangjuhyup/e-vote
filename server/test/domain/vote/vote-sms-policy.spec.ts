import { VoteSmsPolicy } from '../../../src/shared/domain/voting/vote-sms.policy';
import type { FieldVotingSessionReference } from '../../../src/shared/domain/voting/capability-reference';
import { DomainError } from '../../../src/shared/domain/domain-error';
import {
  SmsMessagePurpose,
  type VoteSmsMessagePurpose,
} from '../../../src/shared/domain/voting/type/sms-message-purpose.type';
import { FieldVotingSessionStatus } from '../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { VoteStatus } from '../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../src/shared/domain/voting/type/voting-channel.type';
import { VoteAggregate } from '../../../src/modules/vote/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/shared/domain/voting/type/vote-policy.type';
import { IdentityVerificationPolicy } from '../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/shared/domain/voting/vo/vote-policy.vo';

describe('VoteSmsPolicy', () => {
  it.each<readonly [VoteSmsMessagePurpose, VoteStatus]>([
    [SmsMessagePurpose.VoteParticipationReminder, VoteStatus.Open],
    [SmsMessagePurpose.VoteResultNotice, VoteStatus.Closed],
    [SmsMessagePurpose.UpcomingVoteNotice, VoteStatus.Draft],
  ])('allows %s only for its required vote status', (purpose, status) => {
    expect(() =>
      VoteSmsPolicy.assertVoteMessageAllowed(createVote(status), purpose),
    ).not.toThrow();

    for (const otherStatus of Object.values(VoteStatus).filter(
      (candidate) => candidate !== status,
    )) {
      expect(() =>
        VoteSmsPolicy.assertVoteMessageAllowed(
          createVote(otherStatus),
          purpose,
        ),
      ).toThrow(DomainError);
    }
  });

  it.each([VotingChannel.Onsite, VotingChannel.Visit])(
    'allows a %s session notice while the vote is open and the channel is enabled',
    (channel) => {
      expect(() =>
        VoteSmsPolicy.assertFieldSessionMessageAllowed(
          createVote(VoteStatus.Open, [channel]),
          createSession(channel),
        ),
      ).not.toThrow();
    },
  );

  it('rejects a field session notice unless the vote is open', () => {
    expect(() =>
      VoteSmsPolicy.assertFieldSessionMessageAllowed(
        createVote(VoteStatus.Draft, [VotingChannel.Onsite]),
        createSession(VotingChannel.Onsite),
      ),
    ).toThrow('requires vote status OPEN');
  });

  it('rejects a disabled or non-field voting channel', () => {
    expect(() =>
      VoteSmsPolicy.assertFieldSessionMessageAllowed(
        createVote(VoteStatus.Open, [VotingChannel.Online]),
        createSession(VotingChannel.Onsite),
      ),
    ).toThrow('does not allow field voting session channel');
    expect(() =>
      VoteSmsPolicy.assertFieldSessionMessageAllowed(
        createVote(VoteStatus.Open, [VotingChannel.Online]),
        createSession(VotingChannel.Online),
      ),
    ).toThrow('requires onsite or visit channel');
  });

  it('rejects a session belonging to a different vote', () => {
    expect(() =>
      VoteSmsPolicy.assertFieldSessionMessageAllowed(
        createVote(VoteStatus.Open, [VotingChannel.Visit]),
        createSession(VotingChannel.Visit, 'another-vote'),
      ),
    ).toThrow('does not belong to vote');
  });
});

function createVote(
  status: VoteStatus,
  votingChannels: readonly VotingChannel[] = [VotingChannel.Online],
): VoteAggregate {
  return VoteAggregate.create({
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Board election',
    votingChannels,
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
    status,
  });
}

function createSession(
  channel: VotingChannel,
  voteId = 'vote-1',
): FieldVotingSessionReference {
  return {
    id: 'session-1',
    commissionId: 'commission-1',
    voteId,
    channel,
    status: FieldVotingSessionStatus.Scheduled,
    hasAssignedManager: () => true,
  };
}
