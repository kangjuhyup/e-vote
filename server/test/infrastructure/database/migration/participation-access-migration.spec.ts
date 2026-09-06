import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('participation access migration', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260906040000.ts',
    ),
    'utf8',
  );

  it('keeps permanent invitations and explicitly revokes every legacy row', () => {
    expect(source).toContain('alter column "expires_at" drop not null');
    expect(source).toContain('set "generation" = 0');
    expect(source).toContain('"revoked_at" = coalesce');
    expect(source).not.toContain('insert into "integration_outbox"');
  });

  it('enforces one active participation browser per invitation generation', () => {
    expect(source).toContain('elector_participant_sessions');
    expect(source).toContain(
      'elector_participant_sessions_active_participate_unique',
    );
    expect(source).toContain(
      `where "scope" = 'PARTICIPATE' and "revoked_at" is null`,
    );
  });

  it('creates durable invitation deliveries with a stable generation key', () => {
    expect(source).toContain('participation_invitation_deliveries');
    expect(source).toContain(
      'participation_invitation_deliveries_invitation_generation_unique',
    );
    expect(source).toContain('"invitation_generation" integer not null');
  });
});
