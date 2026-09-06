import type { Server } from 'node:http';
import { UpdateElectorHandler } from '../src/modules/elector/application/command/handler/update-elector.handler';
import { BlockElectorHandler } from '../src/modules/elector/application/command/handler/block-elector.handler';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ElectorController } from '../src/modules/elector/presentation/elector/elector.controller';
import { ParticipationController } from '../src/modules/participation/presentation/participation/participation.controller';
import { CreateElectorHandler } from '../src/modules/elector/application/command/handler/create-elector.handler';
import { AuthenticateElectorHandler } from '../src/modules/elector/application/command/handler/authenticate-elector.handler';
import { CastParticipationHandler } from '../src/modules/participation/application/command/handler/cast-participation.handler';
import { AuthenticatedUserGuard } from '../src/shared/presentation/common/guard/authenticated-user.guard';
import { ACCESS_TOKEN_VERIFIER_PORT } from '../src/shared/application/port/security/access-token-verifier.port';
import { UserPrincipal } from '../src/shared/application/security/user-principal';
import { ElectorParticipantForbiddenError } from '../src/shared/application/port/capability/elector-participant-access.port';
import { ElectorIdentityVerificationUnavailableError } from '../src/modules/elector/application/port/gateway/elector-identity-verification.port';

const voteId = '11111111-1111-4111-8111-111111111111';
const electorId = '22222222-2222-4222-8222-222222222222';
const path = `/votes/${voteId}/electors/${electorId}/authentication`;
const authBody = { provider: 'MOCK', transactionId: 'mock-success:12345678' };
const castBody = {
  voteId,
  electorId,
  voteDetailId: voteId,
  selectedCandidateId: voteId,
  votingChannel: 'ONLINE',
};
describe('participant authentication HTTP', () => {
  let app: INestApplication;
  const authenticate = {
    execute: jest.fn<
      ReturnType<AuthenticateElectorHandler['execute']>,
      Parameters<AuthenticateElectorHandler['execute']>
    >(),
  };
  const cast = {
    execute: jest.fn<
      ReturnType<CastParticipationHandler['execute']>,
      Parameters<CastParticipationHandler['execute']>
    >(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ElectorController, ParticipationController],
      providers: [
        { provide: UpdateElectorHandler, useValue: { execute: jest.fn() } },
        { provide: BlockElectorHandler, useValue: { execute: jest.fn() } },
        { provide: CreateElectorHandler, useValue: { execute: jest.fn() } },
        { provide: AuthenticateElectorHandler, useValue: authenticate },
        { provide: CastParticipationHandler, useValue: cast },
        { provide: APP_GUARD, useClass: AuthenticatedUserGuard },
        {
          provide: ACCESS_TOKEN_VERIFIER_PORT,
          useValue: {
            verify: () =>
              Promise.resolve(UserPrincipal.of({ id: 'trusted-user' })),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.execute.mockResolvedValue({
      id: electorId,
      voteId,
      identityVerified: true,
    });
    cast.execute.mockResolvedValue({
      id: voteId,
      voteDetailId: voteId,
      status: 'CAST',
    });
  });
  afterAll(async () => app.close());
  it('requires login for authentication and participation', async () => {
    await request(app.getHttpServer() as Server)
      .put(path)
      .send(authBody)
      .expect(401);
    await request(app.getHttpServer() as Server)
      .post('/participations')
      .send(castBody)
      .expect(401);
    expect(authenticate.execute).not.toHaveBeenCalled();
    expect(cast.execute).not.toHaveBeenCalled();
  });
  it('ignores forged principal and client time during authentication', async () => {
    const before = Date.now();
    await request(app.getHttpServer() as Server)
      .put(path)
      .auth('test-token', { type: 'bearer' })
      .send({
        ...authBody,
        userPrincipalId: 'attacker',
        verifiedAt: '2000-01-01T00:00:00Z',
      })
      .expect(200);
    const command = authenticate.execute.mock.calls[0][0];
    expect(command.userPrincipalId).toBe('trusted-user');
    expect(command.verifiedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
  it('uses server time and token principal for voting', async () => {
    const before = Date.now();
    await request(app.getHttpServer() as Server)
      .post('/participations')
      .auth('test-token', { type: 'bearer' })
      .send({
        ...castBody,
        userPrincipalId: 'attacker',
        participatedAt: '2000-01-01T00:00:00Z',
      })
      .expect(201);
    const command = cast.execute.mock.calls[0][0];
    expect(command.userPrincipalId).toBe('trusted-user');
    expect(command.participatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
  it('rejects missing provider or transaction and invalid channels before the handler', async () => {
    await request(app.getHttpServer() as Server)
      .put(path)
      .auth('test-token', { type: 'bearer' })
      .send({})
      .expect(400);
    await request(app.getHttpServer() as Server)
      .post('/participations')
      .auth('test-token', { type: 'bearer' })
      .send({ ...castBody, votingChannel: 'INVALID' })
      .expect(400);
    expect(authenticate.execute).not.toHaveBeenCalled();
    expect(cast.execute).not.toHaveBeenCalled();
  });
  it('returns 403 for an elector belonging to another principal', async () => {
    cast.execute.mockRejectedValue(new ElectorParticipantForbiddenError());
    await request(app.getHttpServer() as Server)
      .post('/participations')
      .auth('test-token', { type: 'bearer' })
      .send(castBody)
      .expect(403);
  });
  it('returns 503 when identity verification is disabled', async () => {
    authenticate.execute.mockRejectedValue(
      new ElectorIdentityVerificationUnavailableError(),
    );
    await request(app.getHttpServer() as Server)
      .put(path)
      .auth('test-token', { type: 'bearer' })
      .send(authBody)
      .expect(503);
  });
});
