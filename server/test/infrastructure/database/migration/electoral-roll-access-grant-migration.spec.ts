import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('electoral roll access grant migration', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260902000000.ts',
    ),
    'utf8',
  );

  it('backfills explicit principal grants before removing commission columns', () => {
    const createGrantTable = source.indexOf(
      'create table "electoral_roll_access_grants"',
    );
    const backfillGrants = source.indexOf(
      'insert into "electoral_roll_access_grants"',
    );
    const dropRollCommission = source.indexOf(
      'alter table "electoral_rolls" drop column if exists "commission_id"',
    );

    expect(createGrantTable).toBeGreaterThan(-1);
    expect(backfillGrants).toBeGreaterThan(createGrantTable);
    expect(dropRollCommission).toBeGreaterThan(backfillGrants);
    expect(source).toContain(`where ecm."status" = 'ACTIVE'`);
    expect(source).toContain('ecm."user_principal_id" is not null');
    expect(source).toContain(
      'alter table "electoral_roll_snapshots" drop column if exists "commission_id"',
    );
  });
});
