import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration identifier reconciliation', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260905020000.ts',
    ),
    'utf8',
  );

  it('uses a new migration identity and reconciles both collided schemas idempotently', () => {
    expect(source).toContain('class Migration20260905020000');
    expect(source).toContain(
      'create table if not exists "participation_invitations"',
    );
    expect(source).toContain('billing_orders_vote_active_unique');
    expect(source).toContain("'FINALIZED'");
    expect(source).toContain('create index if not exists');
    expect(source).not.toMatch(/drop\s+table\s+.*participation_invitations/i);
    expect(source).not.toMatch(/delete\s+from\s+"?billing_orders/i);
  });

  it('keeps every committed migration class identifier unique', () => {
    const migrationDirectory = join(
      process.cwd(),
      'src/platform/database/migration',
    );
    const identifiers = readdirSync(migrationDirectory)
      .filter((fileName) => /^Migration\d+\.ts$/.test(fileName))
      .map((fileName) => {
        const migrationSource = readFileSync(
          join(migrationDirectory, fileName),
          'utf8',
        );
        const identifier = migrationSource.match(
          /export class (Migration\d+) extends Migration/,
        )?.[1];
        expect(identifier).toBe(fileName.replace(/\.ts$/, ''));
        return identifier;
      });

    expect(new Set(identifiers).size).toBe(identifiers.length);
  });
});
