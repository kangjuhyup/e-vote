import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('unpaid vote expiration migration', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260919000000.ts',
    ),
    'utf8',
  );

  it('indexes billing-locked draft votes by their payment deadline', () => {
    expect(source).toContain('votes_due_payment_expiration_index');
    expect(source).toContain(`where "status" = 'DRAFT'`);
    expect(source).toContain(`"billing_order_id" is not null`);
  });
});
