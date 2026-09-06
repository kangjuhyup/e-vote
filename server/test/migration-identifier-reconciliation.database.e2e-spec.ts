import { MikroORM, type EntityManager } from '@mikro-orm/postgresql';
import { createDatabaseConfig } from '../src/platform/database/database.config';

const describeDatabase =
  process.env.MIGRATION_IDENTIFIER_RECONCILIATION_E2E_DATABASE === 'true'
    ? describe
    : describe.skip;

describeDatabase('collided migration identifier reconciliation', () => {
  let orm: MikroORM;

  beforeEach(async () => {
    assertDedicatedMigrationTestDatabase();
    const config = await createDatabaseConfig();
    orm = await MikroORM.init({
      ...config,
      migrations: { ...config.migrations, snapshot: false },
    });
    await resetPublicSchema(orm.em);
    await orm.migrator.up({ to: 'Migration20260905000000' });
  });

  afterEach(async () => {
    if (!orm) return;
    await resetPublicSchema(orm.em);
    await orm.close(true);
  });

  it('repairs billing finalization when the participation migration won the identifier collision', async () => {
    await installParticipationSchema(orm.em);
    await markCollidedMigrationExecuted(orm.em);
    await seedPaidVoteBeforeFinalization(orm.em);

    await orm.migrator.up({ to: 'Migration20260905020000' });

    await expectBothSchemas(orm.em);
    const [vote] = await orm.em.getConnection().execute<
      Array<{
        status: string;
        billing_order_id: string | null;
        finalized: boolean;
      }>
    >(
      `select status, billing_order_id, (finalized_at is not null) as finalized
       from votes where id = ?`,
      [VOTE_ID],
    );
    expect(vote).toEqual({
      status: 'FINALIZED',
      billing_order_id: ORDER_ID,
      finalized: true,
    });
  });

  it('repairs participation invitations when the billing migration won the identifier collision', async () => {
    await orm.migrator.up({ to: 'Migration20260905010000' });
    await expect(
      tableExists(orm.em, 'participation_invitations'),
    ).resolves.toBe(false);

    await orm.migrator.up({ to: 'Migration20260905020000' });

    await expectBothSchemas(orm.em);
  });
});

const COMMISSION_ID = '20000000-0000-4000-8000-000000000001';
const VOTE_ID = '20000000-0000-4000-8000-000000000002';
const ORDER_ID = '20000000-0000-4000-8000-000000000003';
const NOW = new Date('2026-09-05T00:00:00.000Z');

function assertDedicatedMigrationTestDatabase(): void {
  if (!process.env.DATABASE_NAME?.endsWith('_migration_test')) {
    throw new Error(
      'migration reconciliation tests require DATABASE_NAME ending in _migration_test',
    );
  }
}

async function resetPublicSchema(entityManager: EntityManager): Promise<void> {
  await entityManager
    .getConnection()
    .execute('drop schema if exists public cascade; create schema public;');
}

async function markCollidedMigrationExecuted(
  entityManager: EntityManager,
): Promise<void> {
  await entityManager.getConnection().execute(
    `insert into mikro_orm_migrations (name, executed_at)
     values ('Migration20260905010000', current_timestamp)`,
  );
}

async function installParticipationSchema(
  entityManager: EntityManager,
): Promise<void> {
  await entityManager.getConnection().execute(`
    create table "participation_invitations" (
      "id" uuid not null,
      "vote_id" uuid not null,
      "elector_id" uuid not null,
      "token_digest" varchar(255) not null,
      "expires_at" timestamptz not null,
      "revoked_at" timestamptz null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null,
      constraint "participation_invitations_pkey" primary key ("id"),
      constraint "participation_invitations_token_digest_unique" unique ("token_digest"),
      constraint "participation_invitations_vote_id_elector_id_unique" unique ("vote_id", "elector_id"),
      constraint "participation_invitations_vote_id_foreign"
        foreign key ("vote_id") references "votes" ("id")
        on update cascade on delete cascade,
      constraint "participation_invitations_elector_id_foreign"
        foreign key ("elector_id") references "electors" ("id")
        on update cascade on delete cascade
    );
    create index "participation_invitations_expires_at_index"
      on "participation_invitations" ("expires_at");
  `);
}

async function seedPaidVoteBeforeFinalization(
  entityManager: EntityManager,
): Promise<void> {
  await entityManager.getConnection().execute(
    `insert into election_commissions (id, name, status, created_at, updated_at)
     values (?, 'Reconciliation', 'ACTIVE', ?, ?)`,
    [COMMISSION_ID, NOW, NOW],
  );
  await entityManager.getConnection().execute(
    `insert into votes (
       id, commission_id, created_by_user_principal_id, billing_order_id,
       finalized_at, title, description, default_privacy_mode,
       default_participation_unit, default_result_storage_mode,
       default_vote_weight_mode, identity_verification_required, status,
       started_at, ended_at, created_at, updated_at
     ) values (
       ?, ?, 'creator-1', ?, null, 'Reconciliation vote', '', 'SECRET',
       'INDIVIDUAL', 'DATABASE', 'EQUAL', false, 'DRAFT', ?, ?, ?, ?
     )`,
    [
      VOTE_ID,
      COMMISSION_ID,
      ORDER_ID,
      NOW,
      new Date('2026-09-06T00:00:00.000Z'),
      NOW,
      NOW,
    ],
  );
  await entityManager.getConnection().execute(
    `insert into billing_orders (
       id, version, vote_id, commission_id, ordered_by_user_principal_id,
       product_code, product_name, elector_count, pricing_unit_size,
       pricing_unit_count, unit_price, amount, currency, status, payment_id,
       issued_at, cancellation_window_days, cancelable_until, paid_at,
       canceled_at, cancellation_reason, refund_requested_at, refunded_at,
       updated_at
     ) values (
       ?, 1, ?, ?, 'creator-1', 'VOTE_USAGE', 'Vote usage', 1, 100, 1,
       3000, 3000, 'KRW', 'PAID', 'payment-1', ?, 7, ?, ?, null, null,
       null, null, ?
     )`,
    [
      ORDER_ID,
      VOTE_ID,
      COMMISSION_ID,
      NOW,
      new Date('2026-09-12T00:00:00.000Z'),
      NOW,
      NOW,
    ],
  );
}

async function expectBothSchemas(entityManager: EntityManager): Promise<void> {
  await expect(
    tableExists(entityManager, 'participation_invitations'),
  ).resolves.toBe(true);
  const [schema] = await entityManager.getConnection().execute<
    Array<{
      finalized_allowed: boolean;
      active_billing_index: boolean;
      reconciliation_recorded: boolean;
    }>
  >(`
    select
      exists(
        select 1 from pg_constraint
        where conname = 'votes_status_check'
          and pg_get_constraintdef(oid) like '%FINALIZED%'
      ) as finalized_allowed,
      exists(
        select 1 from pg_indexes
        where schemaname = 'public'
          and indexname = 'billing_orders_vote_active_unique'
      ) as active_billing_index,
      exists(
        select 1 from mikro_orm_migrations
        where name = 'Migration20260905020000'
      ) as reconciliation_recorded
  `);
  expect(schema).toEqual({
    finalized_allowed: true,
    active_billing_index: true,
    reconciliation_recorded: true,
  });
}

async function tableExists(
  entityManager: EntityManager,
  tableName: string,
): Promise<boolean> {
  const [row] = await entityManager
    .getConnection()
    .execute<Array<{ exists: boolean }>>(
      `select exists(
       select 1 from information_schema.tables
       where table_schema = 'public' and table_name = ?
     ) as exists`,
      [tableName],
    );
  return row?.exists ?? false;
}
