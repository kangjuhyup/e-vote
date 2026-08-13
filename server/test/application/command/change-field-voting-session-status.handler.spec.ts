import { CancelFieldVotingSessionCommand } from '../../../src/application/command/cancel-field-voting-session.command';
import { CancelFieldVotingSessionHandler } from '../../../src/application/command/cancel-field-voting-session.handler';
import { CloseFieldVotingSessionCommand } from '../../../src/application/command/close-field-voting-session.command';
import { CloseFieldVotingSessionHandler } from '../../../src/application/command/close-field-voting-session.handler';
import { OpenFieldVotingSessionCommand } from '../../../src/application/command/open-field-voting-session.command';
import { OpenFieldVotingSessionHandler } from '../../../src/application/command/open-field-voting-session.handler';
import { FieldVotingSessionRepositoryPort } from '../../../src/application/port/field-voting-session-repository.port';
import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { FieldVotingSessionAggregate } from '../../../src/domain/field-voting/field-voting-session.aggregate';
import { FieldVotingSessionStatus } from '../../../src/domain/field-voting/type/field-voting-session-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../src/domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/domain/vote/vo/vote-policy.vo';
import { VoteAggregate } from '../../../src/domain/vote/vote.aggregate';

function createScheduledSessionFixture(): FieldVotingSessionAggregate {
  const session = FieldVotingSessionAggregate.schedule({
    id: 'session-1',
    commission: ElectionCommissionAggregate.create({
      id: 'commission-1',
      name: 'Main Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    }),
    vote: VoteAggregate.create({
      id: 'vote-1',
      commissionId: 'commission-1',
      title: 'Hybrid vote',
      votingChannels: [VotingChannel.Onsite],
      defaultPolicy: VotePolicy.of({
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      }),
      identityVerificationPolicy: IdentityVerificationPolicy.of({
        required: false,
      }),
      status: VoteStatus.Draft,
    }),
    channel: VotingChannel.Onsite,
    title: 'Lobby voting desk',
    locationName: 'Main Lobby',
    address: 'Seoul Office',
    managers: [
      ElectionCommissionMemberAggregate.create({
        id: 'member-1',
        commissionId: 'commission-1',
        name: 'Kim Manager',
        role: ElectionCommissionMemberRole.FieldManager,
        registeredAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ],
    startsAt: new Date('2026-08-20T00:00:00.000Z'),
    endsAt: new Date('2026-08-20T09:00:00.000Z'),
    scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
  });
  session.pullEvents();

  return session;
}

function createRepository(
  session: FieldVotingSessionAggregate,
  save: jest.Mock<Promise<void>, [FieldVotingSessionAggregate]>,
): FieldVotingSessionRepositoryPort {
  return {
    nextId: jest.fn().mockReturnValue('unused'),
    findById: jest.fn().mockResolvedValue(session),
    save,
  };
}

describe('field voting session status handlers', () => {
  it('opens a scheduled field voting session', async () => {
    const session = createScheduledSessionFixture();
    const save = jest
      .fn<Promise<void>, [FieldVotingSessionAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new OpenFieldVotingSessionHandler(
      createRepository(session, save),
    );

    const result = await handler.execute(
      OpenFieldVotingSessionCommand.of({
        fieldVotingSessionId: 'session-1',
        openedAt: new Date('2026-08-20T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'session-1',
      status: FieldVotingSessionStatus.Open,
    });
    expect(save.mock.calls[0][0].status).toBe(FieldVotingSessionStatus.Open);
  });

  it('closes an open field voting session', async () => {
    const session = createScheduledSessionFixture();
    session.open(new Date('2026-08-20T00:00:00.000Z'));
    const save = jest
      .fn<Promise<void>, [FieldVotingSessionAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new CloseFieldVotingSessionHandler(
      createRepository(session, save),
    );

    const result = await handler.execute(
      CloseFieldVotingSessionCommand.of({
        fieldVotingSessionId: 'session-1',
        closedAt: new Date('2026-08-20T09:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'session-1',
      status: FieldVotingSessionStatus.Closed,
    });
    expect(save.mock.calls[0][0].status).toBe(FieldVotingSessionStatus.Closed);
  });

  it('cancels a scheduled field voting session', async () => {
    const session = createScheduledSessionFixture();
    const save = jest
      .fn<Promise<void>, [FieldVotingSessionAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new CancelFieldVotingSessionHandler(
      createRepository(session, save),
    );

    const result = await handler.execute(
      CancelFieldVotingSessionCommand.of({
        fieldVotingSessionId: 'session-1',
        canceledAt: new Date('2026-08-19T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'session-1',
      status: FieldVotingSessionStatus.Canceled,
    });
    expect(save.mock.calls[0][0].status).toBe(
      FieldVotingSessionStatus.Canceled,
    );
  });
});
