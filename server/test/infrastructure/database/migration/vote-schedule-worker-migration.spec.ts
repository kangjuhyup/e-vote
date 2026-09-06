import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('vote schedule worker migration', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260906000000.ts',
    ),
    'utf8',
  );

  it('indexes only schedule states polled by the worker', () => {
    expect(source).toContain('votes_due_open_index');
    expect(source).toContain(`where "status" = 'FINALIZED'`);
    expect(source).toContain('votes_due_close_index');
    expect(source).toContain(`where "status" = 'OPEN'`);
    expect(source).toContain(`"ended_at" > "started_at"`);
  });
});
