import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/postgresql';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { OIDC_AUTHENTICATION_CONFIG } from '../src/platform/authentication/oidc-authentication.config';
import { OIDC_TOKEN_INTROSPECTOR } from '../src/platform/authentication/oidc-token-introspector';
import { getDatabaseEntities } from '../src/platform/database/repository/database-repository.util';
import { ACCESS_TOKEN_VERIFIER_PORT } from '../src/shared/application/port/security/access-token-verifier.port';
import { UserPrincipal } from '../src/shared/application/security/user-principal';

const describeDatabase =
  process.env.COLLECTION_REQUEST_CONTEXT_E2E_DATABASE === 'true'
    ? describe
    : describe.skip;

describeDatabase('MikroORM collections in Nest request context', () => {
  let app: INestApplication<App>;
  let moduleRef: TestingModule;
  let orm: MikroORM;
  let previousPaymentMode: string | undefined;

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    previousPaymentMode = process.env.BILLING_PAYMENT_MODE;
    process.env.BILLING_PAYMENT_MODE = 'mock';
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OIDC_AUTHENTICATION_CONFIG)
      .useValue({})
      .overrideProvider(OIDC_TOKEN_INTROSPECTOR)
      .useValue({ introspect: jest.fn() })
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

          return UserPrincipal.of({ id: USER_PRINCIPAL_ID });
        },
      })
      .compile();

    orm = moduleRef.get(MikroORM);
    orm.config.set('migrations', {
      ...orm.config.get('migrations'),
      snapshot: false,
    });
    await orm.migrator.up();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  beforeEach(async () => {
    const em = orm.em.fork();
    await em
      .getConnection()
      .execute(
        'truncate table integration_outbox, election_commissions, electoral_rolls cascade',
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
        },
      ],
      totalItems: 1,
    });
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
      })
      .expect(201);
    const voteId = (createdVote.body as { readonly id: string }).id;

    await request(app.getHttpServer())
      .put(`/votes/${voteId}/electoral-roll-snapshot`)
      .set('authorization', 'Bearer attach-roll')
      .send({ electoralRollId: ELECTORAL_ROLL_ID })
      .expect(200);

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

    await expectBillingOrderStatus(billingOrderId, 'PAID');

    await request(app.getHttpServer())
      .post(`/billing/vote-usage-orders/${billingOrderId}/cancellation`)
      .set('authorization', 'Bearer cancel-billing-order')
      .send({ reason: 'mock payment refund regression' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 'REFUND_PENDING' });
      });

    await expectBillingOrderStatus(billingOrderId, 'REFUNDED');

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
          'truncate table integration_outbox, election_commissions, electoral_rolls cascade',
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
});

const USER_PRINCIPAL_ID = 'collection-request-context-user';
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
       id, commission_id, electoral_roll_snapshot_id, title, description, default_privacy_mode,
       default_participation_unit, default_result_storage_mode,
       default_vote_weight_mode, identity_verification_required,
       identity_verification_provider, identity_verification_method,
       status, started_at, ended_at, created_at, updated_at
     ) values (
       '${VOTE_ID}', '${COMMISSION_ID}', '${ELECTORAL_ROLL_SNAPSHOT_ID}',
       'Collection regression vote', '', 'SECRET',
       'INDIVIDUAL', 'DATABASE', 'EQUAL', false, null, null, 'DRAFT',
       current_timestamp, current_timestamp, current_timestamp, current_timestamp
     )`,
    `insert into vote_voting_channels (id, vote_id, channel, created_at)
     values ('${VOTING_CHANNEL_ID}', '${VOTE_ID}', 'ONLINE', current_timestamp)`,
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
