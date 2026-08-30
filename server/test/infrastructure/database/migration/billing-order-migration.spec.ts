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

  it('drops the billing table on rollback', () => {
    expect(migrationSource).toContain(
      'drop table if exists "billing_orders" cascade',
    );
  });
});
