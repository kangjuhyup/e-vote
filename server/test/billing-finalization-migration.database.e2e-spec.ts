import { MikroORM, type EntityManager } from '@mikro-orm/postgresql';
import { createDatabaseConfig } from '../src/platform/database/database.config';

const describeDatabase =
  process.env.BILLING_FINALIZATION_MIGRATION_E2E_DATABASE === 'true'
    ? describe
    : describe.skip;

describeDatabase('billing finalization migration database integration', () => {
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
    await orm.migrator.up({ to: 'Migration20260905000000' });
    em = orm.em.fork();
    await seedPreFinalizationLifecycleRows(em);
    await orm.migrator.up({ to: 'Migration20260905010000' });
  });

  afterAll(async () => {
    if (!orm) return;
    await resetPublicSchema(orm.em);
    await orm.close(true);
  });

  it('backfills vote status, lock, and timestamp from each order state', async () => {
    const rows = await em.getConnection().execute<
      Array<{
        id: string;
        status: string;
        billing_order_id: string | null;
        finalized_at: string | null;
      }>
    >(
      `select id, status, billing_order_id, finalized_at
       from votes
       order by id`,
    );

    expect(rows).toEqual([
      expect.objectContaining({
        id: VOTE_IDS.pending,
        status: 'DRAFT',
        billing_order_id: ORDER_IDS.pending,
        finalized_at: null,
      }),
      expect.objectContaining({
        id: VOTE_IDS.paid,
        status: 'FINALIZED',
        billing_order_id: ORDER_IDS.paid,
        finalized_at: '2026-09-01 00:01:00+00',
      }),
      expect.objectContaining({
        id: VOTE_IDS.refundPending,
        status: 'FINALIZED',
        billing_order_id: ORDER_IDS.refundPending,
        finalized_at: '2026-09-01 00:01:00+00',
      }),
      expect.objectContaining({
        id: VOTE_IDS.canceled,
        status: 'DRAFT',
        billing_order_id: null,
        finalized_at: null,
      }),
      expect.objectContaining({
        id: VOTE_IDS.refunded,
        status: 'DRAFT',
        billing_order_id: null,
        finalized_at: null,
      }),
    ]);
  });

  it('retains terminal history while enforcing one active order per vote', async () => {
    await expect(
      insertOrder(em, {
        id: '10000000-0000-4000-8000-000000000099',
        voteId: VOTE_IDS.paid,
        status: 'PENDING_PAYMENT',
      }),
    ).rejects.toThrow();

    await expect(
      insertOrder(em, {
        id: '10000000-0000-4000-8000-000000000098',
        voteId: VOTE_IDS.refunded,
        status: 'PENDING_PAYMENT',
      }),
    ).resolves.toBeDefined();

    const historyCount = await em
      .getConnection()
      .execute<Array<{ count: string }>>(
        'select count(*)::text as count from billing_orders',
      );
    expect(historyCount[0]?.count).toBe('6');
  });
});

const COMMISSION_ID = '00000000-0000-4000-8000-000000000001';
const ISSUED_AT = new Date('2026-09-01T00:00:00.000Z');
const PAID_AT = new Date('2026-09-01T00:01:00.000Z');
const VOTE_IDS = {
  pending: '00000000-0000-4000-8000-000000000011',
  paid: '00000000-0000-4000-8000-000000000012',
  refundPending: '00000000-0000-4000-8000-000000000013',
  canceled: '00000000-0000-4000-8000-000000000014',
  refunded: '00000000-0000-4000-8000-000000000015',
} as const;
const ORDER_IDS = {
  pending: '10000000-0000-4000-8000-000000000011',
  paid: '10000000-0000-4000-8000-000000000012',
  refundPending: '10000000-0000-4000-8000-000000000013',
  canceled: '10000000-0000-4000-8000-000000000014',
  refunded: '10000000-0000-4000-8000-000000000015',
} as const;

function assertDedicatedMigrationTestDatabase(): void {
  if (!process.env.DATABASE_NAME?.endsWith('_migration_test')) {
    throw new Error(
      'billing migration tests require DATABASE_NAME ending in _migration_test',
    );
  }
}

async function resetPublicSchema(entityManager: EntityManager): Promise<void> {
  await entityManager
    .getConnection()
    .execute('drop schema if exists public cascade; create schema public;');
}

async function seedPreFinalizationLifecycleRows(
  entityManager: EntityManager,
): Promise<void> {
  await entityManager.getConnection().execute(
    `insert into election_commissions
      (id, name, status, created_at, updated_at)
     values (?, 'Migration test', 'ACTIVE', ?, ?)`,
    [COMMISSION_ID, ISSUED_AT, ISSUED_AT],
  );

  const states = [
    ['pending', 'DRAFT', 'PENDING_PAYMENT'],
    ['paid', 'DRAFT', 'PAID'],
    ['refundPending', 'CANCELED', 'REFUND_PENDING'],
    ['canceled', 'CANCELED', 'CANCELED'],
    ['refunded', 'CANCELED', 'REFUNDED'],
  ] as const;

  for (const [name, voteStatus, orderStatus] of states) {
    const voteId = VOTE_IDS[name];
    const orderId = ORDER_IDS[name];
    await insertVote(entityManager, {
      id: voteId,
      status: voteStatus,
      billingOrderId: orderId,
    });
    await insertOrder(entityManager, {
      id: orderId,
      voteId,
      status: orderStatus,
    });
  }
}

async function insertVote(
  entityManager: EntityManager,
  params: { id: string; status: string; billingOrderId: string },
): Promise<unknown> {
  return entityManager.getConnection().execute(
    `insert into votes
      (id, title, description, default_privacy_mode,
       default_participation_unit, default_result_storage_mode,
       default_vote_weight_mode, identity_verification_required,
       status, started_at, ended_at, created_at, updated_at, commission_id,
       billing_order_id, finalized_at, created_by_user_principal_id)
     values (?, 'Migration vote', '', 'SECRET', 'INDIVIDUAL', 'DATABASE',
       'EQUAL', false, ?, ?, ?, ?, ?, ?, ?, ?, 'creator-1')`,
    [
      params.id,
      params.status,
      ISSUED_AT,
      new Date('2026-09-02T00:00:00.000Z'),
      ISSUED_AT,
      ISSUED_AT,
      COMMISSION_ID,
      params.billingOrderId,
      ISSUED_AT,
    ],
  );
}

async function insertOrder(
  entityManager: EntityManager,
  params: { id: string; voteId: string; status: string },
): Promise<unknown> {
  const paid =
    params.status === 'PAID' ||
    params.status === 'REFUND_PENDING' ||
    params.status === 'REFUNDED';
  const canceled =
    params.status === 'CANCELED' ||
    params.status === 'REFUND_PENDING' ||
    params.status === 'REFUNDED';
  const refundPending =
    params.status === 'REFUND_PENDING' || params.status === 'REFUNDED';

  return entityManager.getConnection().execute(
    `insert into billing_orders
      (id, vote_id, commission_id, ordered_by_user_principal_id,
       product_code, product_name, elector_count, pricing_unit_size,
       pricing_unit_count, unit_price, amount, currency, status, payment_id,
       issued_at, paid_at, refunded_at, updated_at, cancellation_window_days,
       cancelable_until, canceled_at, cancellation_reason,
       refund_requested_at, version)
     values (?, ?, ?, 'creator-1', 'VOTE_USAGE', 'Vote usage', 1, 100,
       1, 3000, 3000, 'KRW', ?, ?, ?, ?, ?, ?, 7, ?, ?, ?, ?, 1)`,
    [
      params.id,
      params.voteId,
      COMMISSION_ID,
      params.status,
      paid ? `payment-${params.id}` : null,
      ISSUED_AT,
      paid ? PAID_AT : null,
      params.status === 'REFUNDED' ? PAID_AT : null,
      ISSUED_AT,
      new Date('2026-09-08T00:00:00.000Z'),
      canceled ? PAID_AT : null,
      canceled ? 'Migration cancellation' : null,
      refundPending ? PAID_AT : null,
    ],
  );
}
