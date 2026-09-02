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

  beforeAll(async () => {
    assertDedicatedTestDatabase();
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
      .execute('truncate table election_commissions, electoral_rolls cascade');
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

  afterAll(async () => {
    if (orm && (await orm.isConnected())) {
      await orm.em
        .fork()
        .getConnection()
        .execute(
          'truncate table election_commissions, electoral_rolls cascade',
        );
    }
    await app?.close();
  });
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
