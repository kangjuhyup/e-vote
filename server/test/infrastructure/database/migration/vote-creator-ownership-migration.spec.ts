import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('vote creator ownership migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260905000000.ts',
    ),
    'utf8',
  );

  it('adds nullable creator ownership without guessing a legacy owner', () => {
    expect(migrationSource).toContain(
      'add column "created_by_user_principal_id" varchar(255) null',
    );
    expect(migrationSource).not.toMatch(/update\s+"votes"/i);
    expect(migrationSource).not.toContain('election_commission_members');
  });

  it('removes the creator ownership column on rollback', () => {
    expect(migrationSource).toContain(
      'drop column if exists "created_by_user_principal_id"',
    );
  });
});
