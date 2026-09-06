import { ForbiddenException } from '@nestjs/common';
import { UserPrincipal } from '../../../../src/shared/application/security/user-principal';
import { ParticipationAccessController } from '../../../../src/modules/participation/presentation/participation-access/participation-access.controller';
import { ParticipationInvitationController } from '../../../../src/modules/participation/presentation/participation-invitation/participation-invitation.controller';
import type { ExchangeParticipationAccessHandler } from '../../../../src/modules/participation/application/command/handler/exchange-participation-access.handler';
import type { ResolveParticipationAccessSessionHandler } from '../../../../src/modules/participation/application/query/handler/resolve-participation-access-session.handler';
import type { DispatchParticipationInvitationsHandler } from '../../../../src/modules/participation/application/command/handler/dispatch-participation-invitations.handler';
import type { ParticipantSignatureUploadHandler } from '../../../../src/modules/participation/application/command/handler/participant-signature-upload.handler';
import type { CastParticipationWithAccessHandler } from '../../../../src/modules/participation/application/command/handler/cast-participation-with-access.handler';
import type { GetParticipationResultWithAccessHandler } from '../../../../src/modules/participation/application/query/handler/get-participation-result-with-access.handler';
import type { GetParticipationAccessHandler } from '../../../../src/modules/participation/application/query/handler/get-participation-access.handler';
import type { RevokeParticipationAccessSessionHandler } from '../../../../src/modules/participation/application/command/handler/revoke-participation-access-session.handler';
import type { ParticipationAccessRateLimitPort } from '../../../../src/modules/participation/application/port/security/participation-access-rate-limit.port';

/* eslint-disable @typescript-eslint/unbound-method -- Jest verifies injected controller collaborator mocks without invoking an unbound implementation. */

describe('participation access controllers', () => {
  it('exchanges a fragment token into a secure cookie without returning it', async () => {
    const exchange = {
      execute: jest.fn().mockResolvedValue({
        sessionToken: 'raw-session-token',
        csrfToken: 'csrf-token',
        scope: 'PARTICIPATE',
        voteId: 'vote-1',
        sessionExpiresAt: new Date('2026-09-07T00:00:00.000Z'),
      }),
    } as unknown as jest.Mocked<ExchangeParticipationAccessHandler>;
    const resolve = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const controller = new ParticipationAccessController(exchange, resolve, [
      'http://localhost:3001',
    ]);
    const response = responseStub();

    const result = await controller.exchange(
      { token: 'signed-reference' },
      { headers: { origin: 'http://localhost:3001', cookie: undefined } },
      response as never,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'vote_participant_session',
      'raw-session-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      }),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
    expect(result).toEqual({
      csrfToken: 'csrf-token',
      scope: 'PARTICIPATE',
      voteId: 'vote-1',
      sessionExpiresAt: '2026-09-07T00:00:00.000Z',
    });
    expect(JSON.stringify(result)).not.toContain('raw-session-token');
  });

  it('rejects an unapproved browser origin before token exchange', async () => {
    const exchange = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExchangeParticipationAccessHandler>;
    const resolve = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const controller = new ParticipationAccessController(exchange, resolve, [
      'http://localhost:3001',
    ]);

    await expect(
      controller.exchange(
        { token: 'signed-reference' },
        { headers: { origin: 'https://attacker.example', cookie: undefined } },
        responseStub() as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(exchange.execute).not.toHaveBeenCalled();
  });

  it('rate limits token exchange by client and reference before issuing a session', async () => {
    const exchange = {
      execute: jest.fn().mockResolvedValue({
        sessionToken: 'raw-session-token',
        csrfToken: 'csrf-token',
        scope: 'PARTICIPATE',
        voteId: 'vote-1',
        sessionExpiresAt: new Date('2026-09-07T00:00:00.000Z'),
      }),
    } as unknown as jest.Mocked<ExchangeParticipationAccessHandler>;
    const resolve = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const rateLimit = {
      consume: jest.fn().mockResolvedValue(undefined),
    } satisfies jest.Mocked<ParticipationAccessRateLimitPort>;
    const controller = new ParticipationAccessController(
      exchange,
      resolve,
      ['http://localhost:3001'],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      rateLimit,
    );

    await controller.exchange(
      { token: 'signed-reference' },
      {
        ip: '198.51.100.10',
        headers: { origin: 'http://localhost:3001', cookie: undefined },
      },
      responseStub() as never,
    );

    expect(rateLimit.consume).toHaveBeenCalledWith({
      clientAddress: '198.51.100.10',
      referenceToken: 'signed-reference',
    });
    expect(rateLimit.consume.mock.invocationCallOrder[0]).toBeLessThan(
      exchange.execute.mock.invocationCallOrder[0],
    );
  });

  it('maps authenticated dispatch to the vote creator command', async () => {
    const dispatch = {
      execute: jest
        .fn()
        .mockResolvedValue({ totalCount: 2, queuedCount: 1, skippedCount: 1 }),
    } as unknown as jest.Mocked<DispatchParticipationInvitationsHandler>;
    const controller = new ParticipationInvitationController(dispatch);
    const user = UserPrincipal.of({ id: 'creator-1' });

    await expect(
      controller.dispatch(user, { voteId: 'vote-1' }, {}),
    ).resolves.toEqual({
      totalCount: 2,
      queuedCount: 1,
      skippedCount: 1,
    });
    expect(dispatch.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        voteId: 'vote-1',
        requestedByUserPrincipalId: 'creator-1',
        electorIds: undefined,
      }),
    );
  });

  it('submits participation using only session, csrf, ballot, and candidate', async () => {
    const exchange = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExchangeParticipationAccessHandler>;
    const resolve = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const signatures = {} as jest.Mocked<ParticipantSignatureUploadHandler>;
    const cast = {
      execute: jest.fn().mockResolvedValue({
        id: 'participation-1',
        voteDetailId: 'detail-1',
        status: 'CAST',
      }),
    } as unknown as jest.Mocked<CastParticipationWithAccessHandler>;
    const controller = new ParticipationAccessController(
      exchange,
      resolve,
      ['http://localhost:3001'],
      signatures,
      cast,
    );
    const response = responseStub();

    const result = await controller.castParticipation(
      { voteDetailId: 'detail-1', selectedCandidateId: 'candidate-1' },
      {
        headers: {
          origin: 'http://localhost:3001',
          cookie: 'vote_participant_session=session-token',
        },
      },
      'csrf-token',
      response as never,
    );

    expect(cast.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionToken: 'session-token',
        csrfToken: 'csrf-token',
        voteDetailId: 'detail-1',
        selectedCandidateId: 'candidate-1',
      }),
    );
    expect(result).toEqual({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      status: 'CAST',
    });
  });

  it('reads aggregate results using the session parent vote', async () => {
    const exchange = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExchangeParticipationAccessHandler>;
    const resolve = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const results = {
      execute: jest.fn().mockResolvedValue({
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        voteStatus: 'CLOSED',
        voteDetailStatus: 'CLOSED',
        privacyMode: 'SECRET',
        participationUnit: 'INDIVIDUAL',
        voteWeightMode: 'EQUAL',
        participantCount: 1,
        participatedVoteWeight: 1,
        totalVoteCount: 1,
        totalWeightedVoteCount: 1,
        candidates: [],
        votingChannels: [],
      }),
    } as unknown as jest.Mocked<GetParticipationResultWithAccessHandler>;
    const controller = new ParticipationAccessController(
      exchange,
      resolve,
      ['http://localhost:3001'],
      undefined,
      undefined,
      results,
    );

    const response = responseStub();
    const result = await controller.getResult(
      { voteDetailId: 'detail-1' },
      {
        headers: {
          origin: 'http://localhost:3001',
          cookie: 'vote_participant_session=session-token',
        },
      },
      response as never,
    );

    expect(results.execute).toHaveBeenCalledWith({
      sessionToken: 'session-token',
      voteDetailId: 'detail-1',
    });
    expect(result).not.toHaveProperty('selectedCandidateId');
  });

  it('returns a sanitized ballot and revokes the server session on logout', async () => {
    const exchange = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExchangeParticipationAccessHandler>;
    const resolve = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const access = {
      execute: jest.fn().mockResolvedValue({
        scope: 'PARTICIPATE',
        csrfToken: 'csrf-token',
        vote: {
          id: 'vote-1',
          title: 'Vote',
          description: '',
          status: 'OPEN',
          startedAt: new Date('2026-09-06T00:00:00Z'),
          endedAt: new Date('2026-09-07T00:00:00Z'),
        },
        voteDetails: [],
        hasConfirmedSignature: false,
        permittedActions: {
          uploadSignature: true,
          participate: true,
          readResults: false,
        },
      }),
    } as unknown as jest.Mocked<GetParticipationAccessHandler>;
    const revoke = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RevokeParticipationAccessSessionHandler>;
    const controller = new ParticipationAccessController(
      exchange,
      resolve,
      ['http://localhost:3001'],
      undefined,
      undefined,
      undefined,
      access,
      revoke,
    );
    const response = responseStub();
    const request = {
      headers: {
        origin: 'http://localhost:3001',
        cookie: 'vote_participant_session=session-token',
      },
    };

    await expect(
      controller.getAccess(request, response as never),
    ).resolves.toMatchObject({
      voteId: 'vote-1',
      csrfToken: 'csrf-token',
      vote: { title: 'Vote' },
    });
    await controller.logout(
      'http://localhost:3001',
      request,
      response as never,
    );

    expect(revoke.execute).toHaveBeenCalledWith('session-token');
    expect(response.clearCookie).toHaveBeenCalledWith(
      'vote_participant_session',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  function responseStub() {
    return { cookie: jest.fn(), setHeader: jest.fn(), clearCookie: jest.fn() };
  }
});
