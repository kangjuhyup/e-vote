import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('electoral roll snapshot migration', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/infrastructure/database/migration/Migration20260830000000.ts',
    ),
    'utf8',
  );

  it('creates source rolls and immutable snapshot tables', () => {
    for (const table of [
      'electoral_rolls',
      'electoral_roll_members',
      'electoral_roll_snapshots',
      'electoral_roll_snapshot_members',
    ]) {
      expect(source).toContain(`create table "${table}"`);
    }
    expect(source).toContain(
      'electoral_roll_snapshots_roll_id_revision_unique',
    );
    expect(source).toContain('votes_electoral_roll_snapshot_id_foreign');
    expect(source).toContain('electors_vote_id_snapshot_member_id_unique');
    expect(source).toContain('on update cascade on delete restrict');
  });
});
