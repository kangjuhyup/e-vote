import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('elector personal data migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/infrastructure/database/migration/Migration20260813010000.ts',
    ),
    'utf8',
  );

  it('adds encrypted elector personal data columns and hash lookup index', () => {
    expect(migrationSource).toContain(
      'alter table "electors" alter column "name" type text',
    );
    expect(migrationSource).toContain(
      'alter table "electors" add column "phone_number" text null',
    );
    expect(migrationSource).toContain(
      'alter table "electors" add column "phone_number_hash"',
    );
    expect(migrationSource).toContain(
      'alter table "electors" add column "birth_date" text null',
    );
    expect(migrationSource).toContain(
      'electors_vote_id_phone_number_hash_index',
    );
  });
});
