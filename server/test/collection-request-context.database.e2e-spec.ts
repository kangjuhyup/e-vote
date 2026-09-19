import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/postgresql';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { WorkerModule } from '../src/worker.module';
import { getDatabaseEntities } from '../src/platform/database/repository/database-repository.util';
import { ACCESS_TOKEN_VERIFIER_PORT } from '../src/shared/application/port/security/access-token-verifier.port';
import { AUTHZ_ASSERTION_KEY } from '../src/platform/authentication/authz-assertion-verifier.adapter';
import { UserPrincipal } from '../src/shared/application/security/user-principal';
import { HttpExceptionFilter } from '../src/shared/presentation/common/filter/http-exception.filter';
import { RvlogHttpExceptionLogger } from '../src/platform/logging/rvlog-http-exception.logger';
import { MockPaymentOutboxWorker } from '../src/modules/billing/infrastructure/payment/mock-payment-outbox.worker';
import { MOCK_PAYMENT_RANDOM_SOURCE } from '../src/modules/billing/infrastructure/payment/payment-integration.config';
import { VoteScheduleWorker } from '../src/modules/vote/infrastructure/scheduling/vote-schedule.worker';
import { STORAGE_PORT } from '../src/shared/application/port/gateway/storage.port';

const describeDatabase =
  process.env.COLLECTION_REQUEST_CONTEXT_E2E_DATABASE === 'true'
    ? describe
    : describe.skip;

describeDatabase('MikroORM collections in Nest request context', () => {
  let app: INestApplication<App>;
  let moduleRef: TestingModule;
  let orm: MikroORM;
  let previousPaymentMode: string | undefined;
  const storage = {
    createPresignedPutObjectUrl: jest.fn(),
    createPresignedGetObjectUrl: jest.fn(),
    createPresignedDeleteObjectUrl: jest.fn(),
    getObjectMetadata: jest.fn(),
    deleteObject: jest.fn(),
  };

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    previousPaymentMode = process.env.BILLING_PAYMENT_MODE;
    process.env.BILLING_PAYMENT_MODE = 'mock';
    moduleRef = await Test.createTestingModule({
      imports: [AppModule, WorkerModule],
    })
      .overrideProvider(AUTHZ_ASSERTION_KEY)
      .useValue('test-authz-assertion-key-at-least-32-bytes')
      .overrideProvider(ACCESS_TOKEN_VERIFIER_PORT)
      .useValue({
        verify: async (accessToken: string): Promise<UserPrincipal> => {
          const { ElectoralRollAccessGrantEntity, VoteVotingChannelEntity } =
            await getDatabaseEntities();

          if (accessToken === 'preload-vote') {
            await orm.em.findOne(
              VoteVotingChannelEntity,
              { id: VOTING_CHANNEL_ID },
              { populate: ['vote'], strategy: 'joined' },
            );
          }
          if (accessToken === 'preload-electoral-roll') {
            await orm.em.findOne(
              ElectoralRollAccessGrantEntity,
              { id: ELECTORAL_ROLL_ACCESS_GRANT_ID },
              { populate: ['electoralRoll'], strategy: 'joined' },
            );
          }

          return UserPrincipal.of({
            id:
              accessToken === 'different-user'
                ? DIFFERENT_USER_PRINCIPAL_ID
                : USER_PRINCIPAL_ID,
          });
        },
      })
      .overrideProvider(MOCK_PAYMENT_RANDOM_SOURCE)
      .useValue(() => 0)
      .overrideProvider(STORAGE_PORT)
      .useValue(storage)
      .compile();

    orm = moduleRef.get(MikroORM);
    orm.config.set('migrations', {
      ...orm.config.get('migrations'),
      snapshot: false,
    });
    await orm.migrator.up();
    app = moduleRef.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (req.headers.authorization) {
        req.headers['x-vote-authz-assertion'] = 'test-proxy-assertion';
      }
      next();
    });
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(
      new HttpExceptionFilter(new RvlogHttpExceptionLogger()),
    );
    await app.init();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const em = orm.em.fork();
    await em
      .getConnection()
      .execute(
        'truncate table integration_outbox, files, election_commissions, electoral_rolls cascade',
      );
    await seedFixtures(em);
  });

  it('returns a vote page with initialized voting channels', async () => {
    const response = await request(app.getHttpServer())
      .get('/votes?page=1&pageSize=20')
      .set('authorization', 'Bearer preload-vote')
      .expect(200);

    expect(response.body).toMatchObject({
      items: [
        {
          id: VOTE_ID,
          votingChannels: ['ONLINE'],
          attachments: [
            {
              id: VOTE_ATTACHMENT_ID,
              fileId: FILE_ID,
              type: 'NOTICE',
              originalName: 'notice.pdf',
            },
          ],
        },
      ],
      totalItems: 1,
    });
  });

  it('authorizes attachment download and deletion by vote creator against real collections', async () => {
    storage.createPresignedGetObjectUrl.mockResolvedValue({
      storageKey: 'attachments/opaque-key',
      url: 'https://storage.example/download',
      expiresAt: new Date('2026-09-06T00:05:00.000Z'),
    });

    await request(app.getHttpServer())
      .get(`/votes/${VOTE_ID}/attachments/${VOTE_ATTACHMENT_ID}/download-url`)
      .set('authorization', 'Bearer owner-download')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          attachmentId: VOTE_ATTACHMENT_ID,
          downloadUrl: 'https://storage.example/download',
          expiresAt: '2026-09-06T00:05:00.000Z',
        });
        expect(body).not.toHaveProperty('storageKey');
      });

    await request(app.getHttpServer())
      .get(`/votes/${VOTE_ID}/attachments/${VOTE_ATTACHMENT_ID}/download-url`)
      .set('authorization', 'Bearer different-user')
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/votes/${VOTE_ID}/attachments/${VOTE_ATTACHMENT_ID}`)
      .set('authorization', 'Bearer owner-delete')
      .expect(204);
    expect(storage.deleteObject).toHaveBeenCalledWith('attachments/opaque-key');

    const detail = await request(app.getHttpServer())
      .get(`/votes/${VOTE_ID}`)
      .set('authorization', 'Bearer owner-read')
      .expect(200);
    const detailBody = detail.body as unknown as {
      readonly attachments: readonly unknown[];
    };
    expect(detailBody.attachments).toEqual([]);
  });

  it('returns an electoral roll detail with initialized members', async () => {
    const response = await request(app.getHttpServer())
      .get(`/electoral-rolls/${ELECTORAL_ROLL_ID}`)
      .set('authorization', 'Bearer preload-electoral-roll')
      .expect(200);

    expect(response.body).toMatchObject({
      id: ELECTORAL_ROLL_ID,
      members: [
        {
          id: ELECTORAL_ROLL_MEMBER_ID,
          identifier: 'member-1',
        },
      ],
    });
  });

  it('returns an election commission detail with initialized members', async () => {
    await request(app.getHttpServer())
      .put(`/electoral-rolls/${ELECTORAL_ROLL_ID}/members`)
      .set('authorization', 'Bearer add-roll-member')
      .send({ members: [{ identifier: 'member-2' }] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/election-commissions/${COMMISSION_ID}`)
      .set('authorization', 'Bearer commission-detail')
      .expect(200);

    expect(response.body).toMatchObject({
      id: COMMISSION_ID,
      members: [],
    });
  });

  it('returns electors with initialized participation collections after a write request', async () => {
    await request(app.getHttpServer())
      .put(`/electoral-rolls/${ELECTORAL_ROLL_ID}/members`)
      .set('authorization', 'Bearer add-roll-member')
      .send({ members: [{ identifier: 'member-2' }] })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/votes/${VOTE_ID}/electors?page=1&pageSize=20`)
      .set('authorization', 'Bearer elector-page')
      .expect(200);

    expect(response.body).toMatchObject({
      items: [
        {
          id: ELECTOR_ID,
          voteId: VOTE_ID,
          identifier: 'member-1',
          identityVerified: false,
          participated: false,
        },
      ],
      totalItems: 1,
    });
  });

  it('resolves an electoral-roll snapshot after loading the vote aggregate', async () => {
    const response = await request(app.getHttpServer())
      .put(`/votes/${VOTE_ID}/electoral-roll-snapshot`)
      .set('authorization', 'Bearer preload-vote')
      .send({ electoralRollId: ELECTORAL_ROLL_ID })
      .expect(200);

    expect(response.body).toMatchObject({
      voteId: VOTE_ID,
      memberCount: 1,
    });
  });

  it('persists the authenticated vote creator and authorizes billing without commission membership', async () => {
    const createdVote = await request(app.getHttpServer())
      .post('/votes')
      .set('authorization', 'Bearer create-vote')
      .send({
        commissionId: COMMISSION_ID,
        title: 'Creator-owned vote',
        votingChannels: ['ONLINE'],
        defaultPolicy: {
          privacyMode: 'SECRET',
          participationUnit: 'INDIVIDUAL',
          resultStorageMode: 'DATABASE',
          voteWeightMode: 'EQUAL',
        },
        identityVerificationPolicy: { required: false },
        startedAt: '2099-01-01T00:00:00.000Z',
        endedAt: '2099-01-02T00:00:00.000Z',
      })
      .expect(201);
    const voteId = (createdVote.body as { readonly id: string }).id;

    await request(app.getHttpServer())
      .put(`/votes/${voteId}/electoral-roll-snapshot`)
      .set('authorization', 'Bearer attach-roll')
      .send({ electoralRollId: ELECTORAL_ROLL_ID })
      .expect(200);

    const createdDetail = await request(app.getHttpServer())
      .put(`/votes/${voteId}/sub-votes`)
      .set('authorization', 'Bearer create-vote-detail')
      .send({
        title: 'Creator-owned sub-vote',
        type: 'CANDIDATE',
        sortOrder: 0,
      })
      .expect(201);
    const voteDetailId = (createdDetail.body as { readonly id: string }).id;
    await request(app.getHttpServer())
      .put(`/votes/${voteId}/sub-votes/${voteDetailId}/candidates`)
      .set('authorization', 'Bearer create-candidate')
      .send({ candidateNo: 1, name: 'Candidate 1' })
      .expect(201);

    const mockPaymentWorker = moduleRef.get(MockPaymentOutboxWorker);
    await mockPaymentWorker.onApplicationShutdown();

    const billingOrder = await request(app.getHttpServer())
      .post('/billing/vote-usage-orders')
      .set('authorization', 'Bearer create-billing-order')
      .send({ voteId })
      .expect(201);

    expect(billingOrder.body).toMatchObject({
      voteId,
      electorCount: 1,
      amount: 3_000,
      status: 'PENDING_PAYMENT',
    });
    const billingOrderId = (billingOrder.body as { readonly id: string }).id;
    const duplicateOrder = await request(app.getHttpServer())
      .post('/billing/vote-usage-orders')
      .set('authorization', 'Bearer repeat-billing-order')
      .send({ voteId })
      .expect(201);
    expect((duplicateOrder.body as { readonly id: string }).id).toBe(
      billingOrderId,
    );

    await expectPersistedVoteBilling(voteId, {
      status: 'DRAFT',
      billingOrderId,
      finalized: false,
    });
    await expectVoteBillingLifecycle(voteId, {
      status: 'DRAFT',
      activeBillingOrderId: billingOrderId,
      billingOrderStatus: 'PENDING_PAYMENT',
    });
    await expectVoteBillingHiddenFromDifferentUser(voteId);
    await updateVote(voteId, 'Payment-pending update').expect(409);
    await request(app.getHttpServer())
      .put(`/votes/${voteId}/sub-votes`)
      .set('authorization', 'Bearer locked-vote-detail')
      .send({ title: 'Locked detail', type: 'YES_NO', sortOrder: 1 })
      .expect(409);
    await request(app.getHttpServer())
      .put(`/votes/${voteId}/sub-votes/${voteDetailId}/candidates`)
      .set('authorization', 'Bearer locked-candidate')
      .send({ candidateNo: 2, name: 'Locked candidate' })
      .expect(409);

    await mockPaymentWorker.dispatchOnce();
    await expectBillingOrderStatus(billingOrderId, 'PAID');
    await expectPersistedVoteBilling(voteId, {
      status: 'FINALIZED',
      billingOrderId,
      finalized: true,
    });
    await expectVoteBillingLifecycle(voteId, {
      status: 'FINALIZED',
      activeBillingOrderId: billingOrderId,
      billingOrderStatus: 'PAID',
    });
    await expectPersistedVoteBilling(voteId, {
      status: 'FINALIZED',
      billingOrderId,
      finalized: true,
    });
    await updateVote(voteId, 'Paid update').expect(409);

    await request(app.getHttpServer())
      .post(`/billing/vote-usage-orders/${billingOrderId}/cancellation`)
      .set('authorization', 'Bearer cancel-billing-order')
      .send({ reason: 'mock payment refund regression' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 'REFUND_PENDING' });
      });
    await expectPersistedVoteBilling(voteId, {
      status: 'FINALIZED',
      billingOrderId,
      finalized: true,
    });
    await expectVoteBillingLifecycle(voteId, {
      status: 'FINALIZED',
      activeBillingOrderId: billingOrderId,
      billingOrderStatus: 'REFUND_PENDING',
    });
    await updateVote(voteId, 'Refund-pending update').expect(409);

    await mockPaymentWorker.dispatchOnce();
    await mockPaymentWorker.dispatchOnce();
    await expectBillingOrderStatus(billingOrderId, 'REFUNDED');
    await expectPersistedVoteBilling(voteId, {
      status: 'DRAFT',
      billingOrderId: null,
      finalized: false,
    });
    await expectVoteBillingLifecycle(voteId, { status: 'DRAFT' });
    await updateVote(voteId, 'Editable after refund').expect(200);

    const replacementOrder = await request(app.getHttpServer())
      .post('/billing/vote-usage-orders')
      .set('authorization', 'Bearer create-replacement-billing-order')
      .send({ voteId })
      .expect(201);
    expect(replacementOrder.body).toMatchObject({
      voteId,
      status: 'PENDING_PAYMENT',
    });
    expect((replacementOrder.body as { readonly id: string }).id).not.toBe(
      billingOrderId,
    );
    await expectVoteBillingLifecycle(voteId, {
      status: 'DRAFT',
      activeBillingOrderId: (replacementOrder.body as { readonly id: string })
        .id,
      billingOrderStatus: 'PENDING_PAYMENT',
    });

    const em = orm.em.fork();
    const [persistedVote] = await em
      .getConnection()
      .execute<Array<{ created_by_user_principal_id: string | null }>>(
        'select created_by_user_principal_id from votes where id = ?',
        [voteId],
      );
    const [commissionMemberCount] = await em
      .getConnection()
      .execute<Array<{ member_count: number }>>(
        'select count(*)::int as member_count from election_commission_members where commission_id = ?',
        [COMMISSION_ID],
      );

    expect(persistedVote?.created_by_user_principal_id).toBe(USER_PRINCIPAL_ID);
    expect(commissionMemberCount?.member_count).toBe(0);
  });

  it('automatically opens a paid vote at its start time and closes it at its end time', async () => {
    const startedAt = new Date('2099-02-01T00:00:00.000Z');
    const endedAt = new Date('2099-02-01T01:00:00.000Z');
    const createdVote = await request(app.getHttpServer())
      .post('/votes')
      .set('authorization', 'Bearer create-scheduled-vote')
      .send({
        commissionId: COMMISSION_ID,
        title: 'Scheduled paid vote',
        votingChannels: ['ONLINE'],
        defaultPolicy: {
          privacyMode: 'SECRET',
          participationUnit: 'INDIVIDUAL',
          resultStorageMode: 'DATABASE',
          voteWeightMode: 'EQUAL',
        },
        identityVerificationPolicy: { required: false },
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      })
      .expect(201);
    const voteId = (createdVote.body as { readonly id: string }).id;

    await request(app.getHttpServer())
      .put(`/votes/${voteId}/electoral-roll-snapshot`)
      .set('authorization', 'Bearer attach-scheduled-roll')
      .send({ electoralRollId: ELECTORAL_ROLL_ID })
      .expect(200);
    const detail = await request(app.getHttpServer())
      .put(`/votes/${voteId}/sub-votes`)
      .set('authorization', 'Bearer create-scheduled-detail')
      .send({ title: 'Scheduled detail', type: 'CANDIDATE', sortOrder: 0 })
      .expect(201);
    const voteDetailId = (detail.body as { readonly id: string }).id;
    await request(app.getHttpServer())
      .put(`/votes/${voteId}/sub-votes/${voteDetailId}/candidates`)
      .set('authorization', 'Bearer create-scheduled-candidate')
      .send({ candidateNo: 1, name: 'Candidate 1' })
      .expect(201);

    const paymentWorker = moduleRef.get(MockPaymentOutboxWorker);
    await paymentWorker.onApplicationShutdown();
    const orderResponse = await request(app.getHttpServer())
      .post('/billing/vote-usage-orders')
      .set('authorization', 'Bearer create-scheduled-order')
      .send({ voteId })
      .expect(201);
    const orderId = (orderResponse.body as { readonly id: string }).id;
    await paymentWorker.dispatchOnce();
    await expectBillingOrderStatus(orderId, 'PAID');
    await expectVoteBillingLifecycle(voteId, {
      status: 'FINALIZED',
      activeBillingOrderId: orderId,
      billingOrderStatus: 'PAID',
    });

    const scheduleWorker = moduleRef.get(VoteScheduleWorker);
    await expect(
      scheduleWorker.dispatchOnce(new Date(startedAt.getTime() - 1)),
    ).resolves.toBe(0);
    await expect(scheduleWorker.dispatchOnce(startedAt)).resolves.toBe(1);
    await expectVoteBillingLifecycle(voteId, {
      status: 'OPEN',
      activeBillingOrderId: orderId,
      billingOrderStatus: 'PAID',
    });

    await expect(scheduleWorker.dispatchOnce(endedAt)).resolves.toBe(1);
    await expectVoteBillingLifecycle(voteId, {
      status: 'CLOSED',
      activeBillingOrderId: orderId,
      billingOrderStatus: 'PAID',
    });
    await expect(scheduleWorker.dispatchOnce(endedAt)).resolves.toBe(0);
  });

  it('encrypts roll identity data and carries it through the immutable snapshot to electors', async () => {
    await request(app.getHttpServer())
      .put(`/electoral-rolls/${ELECTORAL_ROLL_ID}/members`)
      .set('authorization', 'Bearer add-roll-member')
      .send({
        members: [
          {
            identifier: 'member-2',
            name: '홍길동',
            phoneNumber: '010-1234-5678',
            birthDate: '1990-01-02',
          },
        ],
      })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/electoral-rolls/${ELECTORAL_ROLL_ID}`)
      .set('authorization', 'Bearer preload-electoral-roll')
      .expect(200);
    const detailBody = detail.body as unknown as {
      readonly members: readonly unknown[];
    };
    expect(detailBody.members).toContainEqual(
      expect.objectContaining({
        identifier: 'member-2',
        name: '홍길동',
        phoneNumber: '010-1234-5678',
        birthDate: '1990-01-02',
      }),
    );

    const em = orm.em.fork();
    const [persistedMember] = await em.getConnection().execute<
      Array<{
        encrypted_name: string;
        encrypted_phone_number: string;
        identity_phone_number_hash: string;
      }>
    >(
      `select encrypted_name, encrypted_phone_number, identity_phone_number_hash
       from electoral_roll_members where electoral_roll_id = ? and identifier = ?`,
      [ELECTORAL_ROLL_ID, 'member-2'],
    );
    expect(persistedMember?.encrypted_name).toMatch(/^v1:/);
    expect(persistedMember?.encrypted_name).not.toContain('홍길동');
    expect(persistedMember?.encrypted_phone_number).not.toContain(
      '010-1234-5678',
    );
    expect(persistedMember?.identity_phone_number_hash).toMatch(
      /^[a-f0-9]{64}$/,
    );

    await request(app.getHttpServer())
      .put(`/votes/${VOTE_ID}/electoral-roll-snapshot`)
      .set('authorization', 'Bearer preload-vote')
      .send({ electoralRollId: ELECTORAL_ROLL_ID })
      .expect(200);

    const [materializedElector] = await em.getConnection().execute<
      Array<{
        name: string;
        phone_number: string;
        phone_number_hash: string;
      }>
    >(
      `select name, phone_number, phone_number_hash
       from electors where vote_id = ? and identifier = ?`,
      [VOTE_ID, 'member-2'],
    );
    expect(materializedElector).toMatchObject({
      name: persistedMember?.encrypted_name,
      phone_number: persistedMember?.encrypted_phone_number,
      phone_number_hash: persistedMember?.identity_phone_number_hash,
    });
  });

  afterAll(async () => {
    if (orm && (await orm.isConnected())) {
      await orm.em
        .fork()
        .getConnection()
        .execute(
          'truncate table integration_outbox, files, election_commissions, electoral_rolls cascade',
        );
    }
    await app?.close();
    if (previousPaymentMode === undefined) {
      delete process.env.BILLING_PAYMENT_MODE;
    } else {
      process.env.BILLING_PAYMENT_MODE = previousPaymentMode;
    }
  });

  async function expectBillingOrderStatus(
    billingOrderId: string,
    expectedStatus: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await request(app.getHttpServer())
        .get(`/billing/vote-usage-orders/${billingOrderId}`)
        .set('authorization', 'Bearer get-billing-order')
        .expect(200);
      if (
        (response.body as { readonly status?: string }).status ===
        expectedStatus
      ) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`billing order did not reach ${expectedStatus}`);
  }

  async function expectVoteBillingLifecycle(
    voteId: string,
    expected: {
      readonly status: string;
      readonly activeBillingOrderId?: string;
      readonly billingOrderStatus?: string;
    },
  ): Promise<void> {
    const detailResponse = await request(app.getHttpServer())
      .get(`/votes/${voteId}`)
      .set('authorization', 'Bearer get-vote')
      .expect(200);
    const pageResponse = await request(app.getHttpServer())
      .get('/votes?page=1&pageSize=100')
      .set('authorization', 'Bearer get-vote-page')
      .expect(200);
    const pageBody = pageResponse.body as unknown as {
      readonly items: Array<Record<string, unknown>>;
    };
    const summary = pageBody.items.find((item) => item.id === voteId);

    expect(detailResponse.body).toMatchObject({ id: voteId, ...expected });
    expect(summary).toMatchObject({ id: voteId, ...expected });
    if (expected.activeBillingOrderId === undefined) {
      expect(detailResponse.body).not.toHaveProperty('activeBillingOrderId');
      expect(detailResponse.body).not.toHaveProperty('billingOrderStatus');
      expect(summary).not.toHaveProperty('activeBillingOrderId');
      expect(summary).not.toHaveProperty('billingOrderStatus');
    }
  }

  async function expectVoteBillingHiddenFromDifferentUser(
    voteId: string,
  ): Promise<void> {
    const detailResponse = await request(app.getHttpServer())
      .get(`/votes/${voteId}`)
      .set('authorization', 'Bearer different-user')
      .expect(200);
    const pageResponse = await request(app.getHttpServer())
      .get('/votes?page=1&pageSize=100')
      .set('authorization', 'Bearer different-user')
      .expect(200);
    const pageBody = pageResponse.body as unknown as {
      readonly items: Array<Record<string, unknown>>;
    };
    const summary = pageBody.items.find((item) => item.id === voteId);

    expect(detailResponse.body).not.toHaveProperty('activeBillingOrderId');
    expect(detailResponse.body).not.toHaveProperty('billingOrderStatus');
    expect(summary).not.toHaveProperty('activeBillingOrderId');
    expect(summary).not.toHaveProperty('billingOrderStatus');
  }

  async function expectPersistedVoteBilling(
    voteId: string,
    expected: {
      readonly status: string;
      readonly billingOrderId: string | null;
      readonly finalized: boolean;
    },
  ): Promise<void> {
    const [vote] = await orm.em
      .fork()
      .getConnection()
      .execute<
        Array<{
          status: string;
          billing_order_id: string | null;
          finalized: boolean;
        }>
      >(
        `select status, billing_order_id, (finalized_at is not null) as finalized
         from votes where id = ?`,
        [voteId],
      );
    expect(vote).toEqual({
      status: expected.status,
      billing_order_id: expected.billingOrderId,
      finalized: expected.finalized,
    });
  }

  function updateVote(voteId: string, title: string): request.Test {
    return request(app.getHttpServer())
      .patch(`/votes/${voteId}`)
      .set('authorization', 'Bearer update-vote')
      .send({
        title,
        votingChannels: ['ONLINE'],
        defaultPolicy: {
          privacyMode: 'SECRET',
          participationUnit: 'INDIVIDUAL',
          resultStorageMode: 'DATABASE',
          voteWeightMode: 'EQUAL',
        },
        identityVerificationPolicy: { required: false },
      });
  }
});

const USER_PRINCIPAL_ID = 'collection-request-context-user';
const DIFFERENT_USER_PRINCIPAL_ID = 'different-user-principal';
const COMMISSION_ID = '10000000-0000-4000-8000-000000000001';
const VOTE_ID = '10000000-0000-4000-8000-000000000002';
const VOTING_CHANNEL_ID = '10000000-0000-4000-8000-000000000003';
const ELECTORAL_ROLL_ID = '10000000-0000-4000-8000-000000000004';
const ELECTORAL_ROLL_ACCESS_GRANT_ID = '10000000-0000-4000-8000-000000000005';
const ELECTORAL_ROLL_MEMBER_ID = '10000000-0000-4000-8000-000000000006';
const ELECTORAL_ROLL_SNAPSHOT_ID = '10000000-0000-4000-8000-000000000007';
const ELECTORAL_ROLL_SNAPSHOT_MEMBER_ID =
  '10000000-0000-4000-8000-000000000008';
const ELECTOR_ID = '10000000-0000-4000-8000-000000000009';
const FILE_ID = '10000000-0000-4000-8000-000000000010';
const VOTE_ATTACHMENT_ID = '10000000-0000-4000-8000-000000000011';

function assertDedicatedTestDatabase(): void {
  if (!process.env.DATABASE_NAME?.endsWith('_test')) {
    throw new Error(
      'collection request-context tests require DATABASE_NAME ending in _test',
    );
  }
}

async function seedFixtures(em: MikroORM['em']): Promise<void> {
  const statements = [
    `insert into election_commissions (id, name, status, created_at, updated_at)
     values ('${COMMISSION_ID}', 'Commission', 'ACTIVE', current_timestamp, current_timestamp)`,
    `insert into electoral_rolls (id, name, revision, created_at, updated_at)
     values ('${ELECTORAL_ROLL_ID}', 'Members', 1, current_timestamp, current_timestamp)`,
    `insert into electoral_roll_access_grants (id, electoral_roll_id, user_principal_id, granted_at)
     values ('${ELECTORAL_ROLL_ACCESS_GRANT_ID}', '${ELECTORAL_ROLL_ID}', '${USER_PRINCIPAL_ID}', current_timestamp)`,
    `insert into electoral_roll_members (
       id, electoral_roll_id, identifier, group_key, vote_weight, created_at, updated_at
     ) values (
       '${ELECTORAL_ROLL_MEMBER_ID}', '${ELECTORAL_ROLL_ID}', 'member-1', null, 1,
       current_timestamp, current_timestamp
     )`,
    `insert into electoral_roll_snapshots (
       id, source_roll_id, roll_name, source_revision, member_count, content_hash, created_at
     ) values (
       '${ELECTORAL_ROLL_SNAPSHOT_ID}', '${ELECTORAL_ROLL_ID}', 'Members', 1, 1,
       'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', current_timestamp
     )`,
    `insert into electoral_roll_snapshot_members (
       id, snapshot_id, source_member_id, identifier, group_key, vote_weight, created_at
     ) values (
       '${ELECTORAL_ROLL_SNAPSHOT_MEMBER_ID}', '${ELECTORAL_ROLL_SNAPSHOT_ID}',
       '${ELECTORAL_ROLL_MEMBER_ID}', 'member-1', null, 1, current_timestamp
     )`,
    `insert into votes (
       id, created_by_user_principal_id, commission_id, electoral_roll_snapshot_id, title, description, default_privacy_mode,
       default_participation_unit, default_result_storage_mode,
       default_vote_weight_mode, identity_verification_required,
       identity_verification_provider, identity_verification_method,
       status, started_at, ended_at, created_at, updated_at
     ) values (
       '${VOTE_ID}', '${USER_PRINCIPAL_ID}', '${COMMISSION_ID}', '${ELECTORAL_ROLL_SNAPSHOT_ID}',
       'Collection regression vote', '', 'SECRET',
       'INDIVIDUAL', 'DATABASE', 'EQUAL', false, null, null, 'DRAFT',
       current_timestamp, current_timestamp, current_timestamp, current_timestamp
     )`,
    `insert into vote_voting_channels (id, vote_id, channel, created_at)
     values ('${VOTING_CHANNEL_ID}', '${VOTE_ID}', 'ONLINE', current_timestamp)`,
    `insert into files (
       id, storage_key, original_name, mime_type, size_bytes, checksum, status, created_at, deleted_at
     ) values (
       '${FILE_ID}', 'attachments/opaque-key', 'notice.pdf', 'application/pdf', 1024,
       null, 'ACTIVE', current_timestamp, null
     )`,
    `insert into vote_attachments (id, vote_id, file_id, type, sort_order, created_at)
     values ('${VOTE_ATTACHMENT_ID}', '${VOTE_ID}', '${FILE_ID}', 'NOTICE', 0, current_timestamp)`,
    `insert into electors (
       id, vote_id, snapshot_member_id, name, identifier, phone_number,
       phone_number_hash, birth_date, group_key, vote_weight, status,
       created_at, updated_at
     ) values (
       '${ELECTOR_ID}', '${VOTE_ID}', '${ELECTORAL_ROLL_SNAPSHOT_MEMBER_ID}',
       'Member 1', 'member-1', null, null, null, null, 1, 'ELIGIBLE',
       current_timestamp, current_timestamp
     )`,
  ];

  for (const statement of statements) {
    await em.getConnection().execute(statement);
  }
}
