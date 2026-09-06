import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TEST_USER_PRINCIPAL } from './presentation/user-principal.fixture';
import { ElectionCommissionManagementController } from '../src/modules/election-commission/presentation/election-commission/election-commission-management.controller';
import { ElectoralRollDeletionController } from '../src/modules/electoral-roll/presentation/electoral-roll/electoral-roll-deletion.controller';
import { DeleteElectionCommissionHandler } from '../src/modules/election-commission/application/command/handler/delete-election-commission.handler';
import { RemoveElectionCommissionMemberHandler } from '../src/modules/election-commission/application/command/handler/remove-election-commission-member.handler';
import { UpdateElectionCommissionMemberHandler } from '../src/modules/election-commission/application/command/handler/update-election-commission-member.handler';
import { DeleteElectoralRollHandler } from '../src/modules/electoral-roll/application/command/handler/delete-electoral-roll.handler';
import {
  ElectionCommissionAdminRequiredError,
  ElectionCommissionManagementNotFoundError,
  LastElectionCommissionAdminError,
} from '../src/modules/election-commission/application/command/election-commission-management.error';
import { ElectoralRollNotFoundError } from '../src/modules/electoral-roll/application/command/electoral-roll.error';

const id = '11111111-1111-4111-8111-111111111111';
const memberId = '22222222-2222-4222-8222-222222222222';
const commissionPath = `/election-commissions/${id}`;
const memberPath = `${commissionPath}/members/${memberId}`;
describe('registry management HTTP contracts', () => {
  let app: INestApplication;
  const deleteCommission = { execute: jest.fn() };
  const removeMember = { execute: jest.fn() };
  const updateMember = { execute: jest.fn() };
  const deleteRoll = { execute: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        ElectionCommissionManagementController,
        ElectoralRollDeletionController,
      ],
      providers: [
        {
          provide: DeleteElectionCommissionHandler,
          useValue: deleteCommission,
        },
        {
          provide: RemoveElectionCommissionMemberHandler,
          useValue: removeMember,
        },
        {
          provide: UpdateElectionCommissionMemberHandler,
          useValue: updateMember,
        },
        { provide: DeleteElectoralRollHandler, useValue: deleteRoll },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use(
      (
        req: { user?: typeof TEST_USER_PRINCIPAL },
        _res: unknown,
        next: () => void,
      ) => {
        req.user = TEST_USER_PRINCIPAL;
        next();
      },
    );
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });
  beforeEach(() => jest.resetAllMocks());
  afterAll(async () => app.close());
  it.each([
    [commissionPath, deleteCommission, { commissionId: id }],
    [memberPath, removeMember, { commissionId: id, memberId }],
    [`/electoral-rolls/${id}`, deleteRoll, { electoralRollId: id }],
  ] as const)(
    'returns 204 and forwards authenticated identity for DELETE %s',
    async (path, handler, params) => {
      await request(app.getHttpServer()).delete(path).expect(204);
      expect(handler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          ...params,
          userPrincipalId: TEST_USER_PRINCIPAL.id,
          changedAt: expect.any(Date) as unknown as Date,
        }),
      );
    },
  );
  it('updates name and role using PATCH with no response body', async () => {
    await request(app.getHttpServer())
      .patch(memberPath)
      .send({ name: 'Updated', role: 'ADMIN' })
      .expect(204);
    expect(updateMember.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        commissionId: id,
        memberId,
        name: 'Updated',
        role: 'ADMIN',
        userPrincipalId: TEST_USER_PRINCIPAL.id,
      }),
    );
  });
  it.each([
    { name: '' },
    { name: '  ' },
    { name: null },
    { name: 123 },
    { name: 'a'.repeat(101) },
    { role: 'OWNER' },
    { role: null },
    { userPrincipalId: 'spoofed' },
  ])('rejects invalid or identity-changing PATCH body %j', async (body) => {
    await request(app.getHttpServer()).patch(memberPath).send(body).expect(400);
    expect(updateMember.execute).not.toHaveBeenCalled();
  });
  it.each([
    '/election-commissions/invalid',
    `/election-commissions/${id}/members/invalid`,
    '/electoral-rolls/invalid',
  ])('rejects invalid UUID for DELETE %s', async (path) => {
    await request(app.getHttpServer()).delete(path).expect(400);
  });
  it.each([
    [new ElectionCommissionAdminRequiredError(), 403],
    [new ElectionCommissionManagementNotFoundError(), 404],
    [new LastElectionCommissionAdminError(), 409],
  ] as const)(
    'maps management failures to HTTP status',
    async (error, status) => {
      removeMember.execute.mockRejectedValueOnce(error);
      await request(app.getHttpServer()).delete(memberPath).expect(status);
    },
  );
  it('returns 404 for an inaccessible roll', async () => {
    deleteRoll.execute.mockRejectedValueOnce(new ElectoralRollNotFoundError());
    await request(app.getHttpServer())
      .delete(`/electoral-rolls/${id}`)
      .expect(404);
  });
});
