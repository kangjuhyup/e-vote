import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('election commission user principal migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260830010000.ts',
    ),
    'utf8',
  );

  it('adds a nullable principal binding and authorized lookup indexes', () => {
    expect(migrationSource).toContain(
      'add column "user_principal_id" varchar(255) null',
    );
    expect(migrationSource).toContain('"commission_id", "user_principal_id"');
    expect(migrationSource).toContain('"user_principal_id", "status"');
  });

  it('removes indexes before dropping the principal binding', () => {
    expect(migrationSource).toContain(
      'drop index if exists "election_commission_members_user_principal_status_index"',
    );
    expect(migrationSource).toContain(
      'drop column if exists "user_principal_id"',
    );
  });
});
