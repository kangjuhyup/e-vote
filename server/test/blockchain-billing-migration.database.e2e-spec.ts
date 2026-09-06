import { MikroORM, type EntityManager } from '@mikro-orm/postgresql';
import { createDatabaseConfig } from '../src/platform/database/database.config';

const describeDatabase =
  process.env.BLOCKCHAIN_BILLING_MIGRATION_E2E_DATABASE === 'true'
    ? describe
    : describe.skip;

const COMMISSION_ID = '10000000-0000-4000-8000-000000000001';
const LEGACY_VOTE_ID = '20000000-0000-4000-8000-000000000001';
const LEGACY_ORDER_ID = '30000000-0000-4000-8000-000000000001';
const BLOCKCHAIN_VOTE_ID = '20000000-0000-4000-8000-000000000002';
const BLOCKCHAIN_ORDER_ID = '30000000-0000-4000-8000-000000000002';
const NOW = new Date('2026-09-06T00:00:00.000Z');

describeDatabase('blockchain billing migration database integration', () => {
  let orm: MikroORM | undefined;
  let em: EntityManager;

  beforeAll(async () => {
    assertDedicatedMigrationTestDatabase();
    const config = await createDatabaseConfig();
    orm = await MikroORM.init({
      ...config,
      migrations: { ...config.migrations, snapshot: false },
    });
    await resetPublicSchema(orm.em);
    await orm.migrator.up({ to: 'Migration20260906020000' });
    em = orm.em.fork();

    await insertCommission(em);
    await insertVote(em, LEGACY_VOTE_ID);
    await insertOrder(em, {
      id: LEGACY_ORDER_ID,
      voteId: LEGACY_VOTE_ID,
      amount: 3_000,
    });
    await orm.migrator.up({ to: 'Migration20260906030000' });
  });

  afterAll(async () => {
    if (!orm) return;
    await resetPublicSchema(orm.em);
    await orm.close(true);
  });

  it('preserves legacy totals with a zero blockchain surcharge snapshot', async () => {
    const [order] = await em.getConnection().execute<
      Array<{
        amount: number;
        blockchain_storage_count: number;
        blockchain_storage_unit_price: number;
      }>
    >(
      `select amount, blockchain_storage_count, blockchain_storage_unit_price
       from billing_orders
       where id = ?`,
      [LEGACY_ORDER_ID],
    );

    expect(order).toEqual({
      amount: 3_000,
      blockchain_storage_count: 0,
      blockchain_storage_unit_price: 3_000,
    });
  });

  it('accepts a valid surcharge total and rejects an inconsistent total', async () => {
    await insertVote(em, BLOCKCHAIN_VOTE_ID);
    await insertOrder(em, {
      id: BLOCKCHAIN_ORDER_ID,
      voteId: BLOCKCHAIN_VOTE_ID,
      amount: 9_000,
      blockchainStorageCount: 2,
    });

    await expect(
      em
        .getConnection()
        .execute('update billing_orders set amount = 6000 where id = ?', [
          BLOCKCHAIN_ORDER_ID,
        ]),
    ).rejects.toThrow();
    await expect(orm?.migrator.down()).rejects.toThrow(
      'cannot remove blockchain billing snapshots',
    );
  });
});

function assertDedicatedMigrationTestDatabase(): void {
  if (!process.env.DATABASE_NAME?.endsWith('_test')) {
    throw new Error(
      'blockchain billing migration tests require DATABASE_NAME ending in _test',
    );
  }
}

async function resetPublicSchema(entityManager: EntityManager): Promise<void> {
  await entityManager
    .getConnection()
    .execute('drop schema if exists public cascade; create schema public;');
}

async function insertCommission(entityManager: EntityManager): Promise<void> {
  await entityManager.getConnection().execute(
    `insert into election_commissions
      (id, name, status, created_at, updated_at)
     values (?, 'Blockchain billing migration', 'ACTIVE', ?, ?)`,
    [COMMISSION_ID, NOW, NOW],
  );
}

async function insertVote(
  entityManager: EntityManager,
  voteId: string,
): Promise<void> {
  await entityManager.getConnection().execute(
    `insert into votes (
       id, commission_id, created_by_user_principal_id, title, description,
       default_privacy_mode, default_participation_unit,
       default_result_storage_mode, default_vote_weight_mode,
       identity_verification_required, status, started_at, ended_at,
       created_at, updated_at
     ) values (
       ?, ?, 'creator-1', 'Migration vote', '', 'SECRET', 'INDIVIDUAL',
       'DATABASE', 'EQUAL', false, 'DRAFT', ?, ?, ?, ?
     )`,
    [voteId, COMMISSION_ID, NOW, NOW, NOW, NOW],
  );
}

async function insertOrder(
  entityManager: EntityManager,
  params: {
    id: string;
    voteId: string;
    amount: number;
    blockchainStorageCount?: number;
  },
): Promise<void> {
  const blockchainColumns =
    params.blockchainStorageCount === undefined
      ? ''
      : ', blockchain_storage_count, blockchain_storage_unit_price';
  const blockchainValues =
    params.blockchainStorageCount === undefined ? '' : ', ?, 3000';
  const queryParams = [
    params.id,
    params.voteId,
    COMMISSION_ID,
    params.amount,
    NOW,
    new Date('2026-09-13T00:00:00.000Z'),
    NOW,
    ...(params.blockchainStorageCount === undefined
      ? []
      : [params.blockchainStorageCount]),
  ];

  await entityManager.getConnection().execute(
    `insert into billing_orders (
       id, version, vote_id, commission_id, ordered_by_user_principal_id,
       product_code, product_name, elector_count, pricing_unit_size,
       pricing_unit_count, unit_price, amount, currency, status, issued_at,
       cancellation_window_days, cancelable_until, updated_at
       ${blockchainColumns}
     ) values (
       ?, 1, ?, ?, 'creator-1', 'VOTE_USAGE', 'Vote usage', 1, 100, 1,
       3000, ?, 'KRW', 'PENDING_PAYMENT', ?, 7, ?, ?
       ${blockchainValues}
     )`,
    queryParams,
  );
}
