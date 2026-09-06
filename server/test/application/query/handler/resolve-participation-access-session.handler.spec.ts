import { ResolveParticipationAccessSessionHandler } from '../../../../src/modules/participation/application/query/handler/resolve-participation-access-session.handler';
import {
  ParticipationAccessCsrfDeniedError,
  ParticipationAccessSessionInvalidError,
} from '../../../../src/modules/participation/application/query/participation-access-session.error';
import { ElectorParticipantSessionAggregate } from '../../../../src/modules/participation/domain/access/elector-participant-session.aggregate';
import { ParticipationInvitationAggregate } from '../../../../src/modules/participation/domain/access/participation-invitation.aggregate';
import type { ParticipationAccessRepositoryPort } from '../../../../src/modules/participation/application/port/persistence/command/participation-access-repository.port';
import type { ParticipationAccessTokenPort } from '../../../../src/modules/participation/application/port/security/participation-access-token.port';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import type { ElectorRepositoryPort } from '../../../../src/modules/elector/application/port/persistence/command/elector-repository.port';
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

describe('ResolveParticipationAccessSessionHandler', () => {
  const now = new Date('2026-09-06T12:00:00.000Z');
  const tokens = {
    digest: jest.fn((value: string) => `${value}-digest`),
    issueReference: jest.fn(),
    verifyReference: jest.fn(),
    issueSessionCredentials: jest.fn(),
  } satisfies jest.Mocked<ParticipationAccessTokenPort>;

  it('resolves a live participation session and validates CSRF for mutation', async () => {
    const handler = createHandler(VoteStatus.Open, 'PARTICIPATE');

    await expect(
      handler.execute({
        sessionToken: 'session-token',
        csrfToken: 'csrf-token',
        expectedScope: 'PARTICIPATE',
        requireCsrf: true,
        now,
      }),
    ).resolves.toEqual({
      sessionId: 'session-1',
      invitationId: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      scope: 'PARTICIPATE',
    });
  });

  it('rejects mutation when the csrf proof is absent or mismatched', async () => {
    const handler = createHandler(VoteStatus.Open, 'PARTICIPATE');

    await expect(
      handler.execute({
        sessionToken: 'session-token',
        csrfToken: 'wrong',
        expectedScope: 'PARTICIPATE',
        requireCsrf: true,
        now,
      }),
    ).rejects.toThrow(ParticipationAccessCsrfDeniedError);
  });

  it('rejects participation scope after close and result scope before close', async () => {
    await expect(
      createHandler(VoteStatus.Closed, 'PARTICIPATE').execute({
        sessionToken: 'session-token',
        expectedScope: 'PARTICIPATE',
        requireCsrf: false,
        now,
      }),
    ).rejects.toThrow(ParticipationAccessSessionInvalidError);

    await expect(
      createHandler(VoteStatus.Open, 'RESULT_READ').execute({
        sessionToken: 'session-token',
        expectedScope: 'RESULT_READ',
        requireCsrf: false,
        now,
      }),
    ).rejects.toThrow(ParticipationAccessSessionInvalidError);
  });

  function createHandler(
    voteStatus: (typeof VoteStatus)[keyof typeof VoteStatus],
    scope: 'PARTICIPATE' | 'RESULT_READ',
  ) {
    const session =
      scope === 'PARTICIPATE'
        ? ElectorParticipantSessionAggregate.issueParticipation(sessionParams())
        : ElectorParticipantSessionAggregate.issueResultRead(sessionParams());
    const invitation = ParticipationInvitationAggregate.issue({
      id: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      tokenDigest: 'reference-digest',
      signingKeyId: 'current',
      issuedByUserPrincipalId: 'creator-1',
      now,
    });
    const access = {
      findSessionByTokenDigest: jest.fn().mockResolvedValue(session),
      findInvitationById: jest.fn().mockResolvedValue(invitation),
      saveSession: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ParticipationAccessRepositoryPort>;
    const votes = {
      findById: jest.fn().mockResolvedValue(vote(voteStatus)),
    } as unknown as jest.Mocked<VoteRepositoryPort>;
    const electors = {
      findById: jest.fn().mockResolvedValue(
        ElectorAggregate.reconstitute({
          id: 'elector-1',
          voteId: 'vote-1',
          identifier: 'code',
          voteWeight: 1,
          status: ElectorStatus.Eligible,
          identityVerified: false,
        }),
      ),
    } as unknown as jest.Mocked<ElectorRepositoryPort>;
    return new ResolveParticipationAccessSessionHandler(
      access,
      tokens,
      votes,
      electors,
    );
  }

  function sessionParams() {
    return {
      id: 'session-1',
      tokenDigest: 'session-token-digest',
      csrfTokenDigest: 'csrf-token-digest',
      invitationId: 'invitation-1',
      voteId: 'vote-1',
      electorId: 'elector-1',
      invitationGeneration: 1,
      expiresAt: new Date('2026-10-06T00:00:00.000Z'),
      now,
    };
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
      billingOrderId: 'billing-1',
      finalizedAt: new Date('2026-09-05T00:00:00.000Z'),
    });
  }
});
