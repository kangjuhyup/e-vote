import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('vote detail attachment migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260813020000.ts',
    ),
    'utf8',
  );

  it('adds a vote detail attachment table linked to files', () => {
    expect(migrationSource).toContain('create table "vote_detail_attachments"');
    expect(migrationSource).toContain(
      'vote_detail_attachments_vote_detail_id_file_id_unique',
    );
    expect(migrationSource).toContain('vote_detail_attachments_type_check');
    expect(migrationSource).toContain('references "vote_details" ("id")');
    expect(migrationSource).toContain('references "files" ("id")');
  });
});
