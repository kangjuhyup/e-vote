import { ExchangeParticipationAccessCommand } from '../../../../src/modules/participation/application/command/dto/request/exchange-participation-access.command';
import {
  ParticipationAccessConflictError,
  ParticipationAccessUnavailableError,
} from '../../../../src/modules/participation/application/command/participation-access.error';
import { ExchangeParticipationAccessHandler } from '../../../../src/modules/participation/application/command/handler/exchange-participation-access.handler';
import { ParticipationInvitationAggregate } from '../../../../src/modules/participation/domain/access/participation-invitation.aggregate';
import { ElectorParticipantSessionAggregate } from '../../../../src/modules/participation/domain/access/elector-participant-session.aggregate';
import type { ParticipationAccessRepositoryPort } from '../../../../src/modules/participation/application/port/persistence/command/participation-access-repository.port';
import type { ParticipationAccessTokenPort } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import type { ElectorRepositoryPort } from '../../../../src/modules/elector/application/port/persistence/command/elector-repository.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import { ElectorAggregate } from '../../../../src/modules/elector/domain/elector.aggregate';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';

describe('ExchangeParticipationAccessHandler', () => {
  const now = new Date('2026-09-06T12:00:00.000Z');
  const invitation = () =>
    ParticipationInvitationAggregate.issue({
      id: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      tokenDigest: 'reference-digest',
      signingKeyId: 'current',
      issuedByUserPrincipalId: 'creator-1',
      now,
    });
  const access = {
    nextId: jest.fn().mockReturnValue('session-1'),
    findInvitationByElectorForUpdate: jest.fn(),
    findInvitationByIdForUpdate: jest
      .fn()
      .mockImplementation(() => Promise.resolve(invitation())),
    saveInvitation: jest.fn().mockResolvedValue(undefined),
    findSessionByTokenDigest: jest.fn().mockResolvedValue(undefined),
    findSessionById: jest.fn(),
    saveSession: jest.fn().mockResolvedValue(undefined),
    revokeSessionsForInvitation: jest.fn(),
    revokeAccessForVote: jest.fn(),
    revokeAccessForElector: jest.fn(),
    enqueueDelivery: jest.fn(),
    claimDeliveryBatch: jest.fn(),
    markDeliverySent: jest.fn(),
    markDeliverySkipped: jest.fn(),
    rescheduleDelivery: jest.fn(),
    markDeliveryDead: jest.fn(),
  } satisfies jest.Mocked<ParticipationAccessRepositoryPort>;
  const tokens = {
    verifyReference: jest.fn().mockReturnValue({
      invitationId: 'invitation-1',
      generation: 1,
      keyId: 'current',
      tokenDigest: 'reference-digest',
    }),
    issueSessionCredentials: jest.fn().mockReturnValue({
      sessionToken: 'session-token',
      sessionTokenDigest: 'session-digest',
      csrfToken: 'csrf-token',
      csrfTokenDigest: 'csrf-digest',
    }),
    issueReference: jest.fn(),
    digest: jest.fn((value: string) => `${value}-digest`),
  } satisfies jest.Mocked<ParticipationAccessTokenPort>;
  const transactions = {
    runInTransaction: jest.fn(async (work: () => Promise<unknown>) => work()),
  } satisfies jest.Mocked<DatabaseTransactionManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    access.findInvitationByIdForUpdate.mockImplementation(() =>
      Promise.resolve(invitation()),
    );
    access.findSessionByTokenDigest.mockResolvedValue(undefined);
  });

  it.each([VoteStatus.Finalized, VoteStatus.Open])(
    'issues participation scope while vote is %s',
    async (status) => {
      const handler = createHandler(status);

      const result = await handler.execute(
        ExchangeParticipationAccessCommand.of({ token: 'signed-reference' }),
        now,
      );

      expect(result).toMatchObject({
        scope: 'PARTICIPATE',
        sessionToken: 'session-token',
        csrfToken: 'csrf-token',
        voteId: 'vote-1',
      });
      expect(access.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: new Date('2026-09-07T00:00:00.000Z'),
        }),
      );
      expect(access.saveInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ claimedSessionId: 'session-1' }),
      );
    },
  );

  it('issues result-only scope after close without enforcing browser ownership', async () => {
    const claimed = invitation();
    claimed.claimForParticipation('other-browser-session', now);
    access.findInvitationByIdForUpdate.mockResolvedValueOnce(claimed);
    const handler = createHandler(VoteStatus.Closed);

    const result = await handler.execute(
      ExchangeParticipationAccessCommand.of({ token: 'signed-reference' }),
      now,
    );

    expect(result.scope).toBe('RESULT_READ');
    expect(access.saveInvitation).not.toHaveBeenCalled();
    expect(access.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'RESULT_READ',
        expiresAt: new Date('2026-10-06T12:00:00.000Z'),
      }),
    );
  });

  it('rejects a second browser before close', async () => {
    const claimed = invitation();
    claimed.claimForParticipation('other-browser-session', now);
    access.findInvitationByIdForUpdate.mockResolvedValueOnce(claimed);
    const handler = createHandler(VoteStatus.Open);

    await expect(
      handler.execute(
        ExchangeParticipationAccessCommand.of({ token: 'signed-reference' }),
        now,
      ),
    ).rejects.toThrow(ParticipationAccessConflictError);
  });

  it('rotates credentials idempotently for the browser that owns the claim', async () => {
    const claimed = invitation();
    claimed.claimForParticipation('session-1', now);
    access.findInvitationByIdForUpdate.mockResolvedValueOnce(claimed);
    access.findSessionByTokenDigest.mockResolvedValueOnce(
      ElectorParticipantSessionAggregate.issueParticipation({
        id: 'session-1',
        tokenDigest: 'old-session-token-digest',
        csrfTokenDigest: 'old-csrf-digest',
        invitationId: 'invitation-1',
        voteId: 'vote-1',
        electorId: 'elector-1',
        invitationGeneration: 1,
        expiresAt: new Date('2026-09-07T00:00:00.000Z'),
        now,
      }),
    );
    const handler = createHandler(VoteStatus.Open);

    const result = await handler.execute(
      ExchangeParticipationAccessCommand.of({
        token: 'signed-reference',
        currentSessionToken: 'old-session-token',
      }),
      now,
    );

    expect(result).toMatchObject({
      scope: 'PARTICIPATE',
      sessionToken: 'session-token',
      csrfToken: 'csrf-token',
    });
    expect(access.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'session-1',
        tokenDigest: 'session-digest',
        csrfTokenDigest: 'csrf-digest',
      }),
    );
  });

  it.each([VoteStatus.Draft, VoteStatus.Canceled])(
    'rejects access while vote is %s',
    async (status) => {
      const handler = createHandler(status);
      await expect(
        handler.execute(
          ExchangeParticipationAccessCommand.of({ token: 'signed-reference' }),
          now,
        ),
      ).rejects.toThrow(ParticipationAccessUnavailableError);
    },
  );

  function createHandler(status: (typeof VoteStatus)[keyof typeof VoteStatus]) {
    const votes = {
      nextId: jest.fn(),
      findById: jest.fn().mockResolvedValue(vote(status)),
      save: jest.fn(),
    } satisfies jest.Mocked<VoteRepositoryPort>;
    const electors = {
      nextId: jest.fn(),
      findById: jest.fn().mockResolvedValue(
        ElectorAggregate.reconstitute({
          id: 'elector-1',
          voteId: 'vote-1',
          identifier: 'elector-code',
          voteWeight: 1,
          status: ElectorStatus.Eligible,
          identityVerified: false,
        }),
      ),
      save: jest.fn(),
    } satisfies jest.Mocked<ElectorRepositoryPort>;
    return new ExchangeParticipationAccessHandler(
      votes,
      electors,
      access,
      tokens,
      transactions,
    );
  }

  function vote(status: (typeof VoteStatus)[keyof typeof VoteStatus]) {
    return VoteAggregate.reconstitute({
      id: 'vote-1',
      createdByUserPrincipalId: 'creator-1',
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
      startedAt: new Date('2026-09-06T00:00:00.000Z'),
      endedAt: new Date('2026-09-07T00:00:00.000Z'),
      status,
      billingOrderId: status === VoteStatus.Draft ? undefined : 'billing-1',
      finalizedAt:
        status === VoteStatus.Draft
          ? undefined
          : new Date('2026-09-05T00:00:00.000Z'),
    });
  }
});
