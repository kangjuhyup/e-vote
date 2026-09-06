import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('billing order migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260830030000.ts',
    ),
    'utf8',
  );
  const cancellationMigrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260831000000.ts',
    ),
    'utf8',
  );
  const outboxMigrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260902010000.ts',
    ),
    'utf8',
  );
  const finalizationMigrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260905010000.ts',
    ),
    'utf8',
  );
  const blockchainPricingMigrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260906030000.ts',
    ),
    'utf8',
  );

  it('creates immutable-price billing orders with idempotency constraints', () => {
    expect(migrationSource).toContain('create table "billing_orders"');
    expect(migrationSource).toContain('"product_code" varchar(255) not null');
    expect(migrationSource).toContain('"elector_count" integer not null');
    expect(migrationSource).toContain('"pricing_unit_size" integer not null');
    expect(migrationSource).toContain('"pricing_unit_count" integer not null');
    expect(migrationSource).toContain('"unit_price" integer not null');
    expect(migrationSource).toContain('"amount" integer not null');
    expect(migrationSource).toContain('billing_orders_amount_valid');
    expect(migrationSource).toContain('billing_orders_vote_unique');
    expect(migrationSource).toContain('billing_orders_payment_unique');
    expect(migrationSource).toContain('where "payment_id" is not null');
  });

  it('adds vote finalization and cancellation policy snapshots', () => {
    expect(cancellationMigrationSource).toContain('"billing_order_id" uuid');
    expect(cancellationMigrationSource).toContain('"finalized_at" timestamptz');
    expect(cancellationMigrationSource).toContain(
      '"cancellation_window_days" integer',
    );
    expect(cancellationMigrationSource).toContain(
      '"cancelable_until" timestamptz',
    );
    expect(cancellationMigrationSource).toContain('"refund_requested_at"');
    expect(cancellationMigrationSource).toContain(
      'set "billing_order_id" = "bo"."id", "finalized_at" = "bo"."issued_at"',
    );
    expect(cancellationMigrationSource).toContain(
      '"cancellation_reason" = \\\'LEGACY_REFUND\\\'',
    );
  });

  it('drops the billing table on rollback', () => {
    expect(migrationSource).toContain(
      'drop table if exists "billing_orders" cascade',
    );
  });

  it('adds versioned outbox storage without replaying historical orders', () => {
    expect(outboxMigrationSource).toContain(
      'alter table "billing_orders" add column "version" integer not null default 1',
    );
    expect(outboxMigrationSource).toContain(
      'create table "integration_outbox"',
    );
    expect(outboxMigrationSource).toContain(
      'integration_outbox_transition_unique',
    );
    expect(outboxMigrationSource).toContain('integration_outbox_pending_due');
    expect(outboxMigrationSource).toContain(
      'integration_outbox_processing_lease',
    );
    expect(outboxMigrationSource).toContain(
      'integration_outbox_aggregate_order',
    );
    expect(outboxMigrationSource).not.toContain(
      'insert into "integration_outbox"',
    );
  });

  it('models paid vote finalization and permits a new order after a terminal cancellation', () => {
    expect(finalizationMigrationSource).toContain(
      'billing_orders_vote_active_unique',
    );
    expect(finalizationMigrationSource).toContain(
      "where \"status\" in ('PENDING_PAYMENT', 'PAID', 'REFUND_PENDING')",
    );
    expect(finalizationMigrationSource).toContain("'FINALIZED'");
    expect(finalizationMigrationSource).toContain(
      'and "bo"."status" in (\'CANCELED\', \'REFUNDED\')',
    );
    expect(finalizationMigrationSource).not.toContain(
      'delete from "billing_orders"',
    );
  });

  it('adds immutable blockchain result storage pricing snapshots', () => {
    expect(blockchainPricingMigrationSource).toContain(
      '"blockchain_storage_count" integer not null default 0',
    );
    expect(blockchainPricingMigrationSource).toContain(
      '"blockchain_storage_unit_price" integer not null default 3000',
    );
    expect(blockchainPricingMigrationSource).toContain(
      'billing_orders_blockchain_storage_count_non_negative',
    );
    expect(blockchainPricingMigrationSource).toContain(
      '"blockchain_storage_unit_price" * "blockchain_storage_count"',
    );
    expect(blockchainPricingMigrationSource).toContain(
      'cannot remove blockchain billing snapshots',
    );
  });
});
