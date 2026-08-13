import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('election commission field voting migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/infrastructure/database/migration/Migration20260813000000.ts',
    ),
    'utf8',
  );

  it('creates field voting tables and alters existing vote tables', () => {
    for (const tableName of [
      'election_commissions',
      'election_commission_members',
      'vote_voting_channels',
      'field_voting_sessions',
      'field_voting_session_managers',
      'field_participation_evidences',
    ]) {
      expect(migrationSource).toContain(`create table "${tableName}"`);
    }

    expect(migrationSource).toContain(
      'alter table "votes" add column "commission_id"',
    );
    expect(migrationSource).toContain(
      'alter table "vote_participations" add column "voting_channel"',
    );
    expect(migrationSource).toContain(
      'alter table "vote_participations" add column "field_voting_session_id"',
    );
  });

  it('declares field voting channel constraints', () => {
    expect(migrationSource).toContain('field_voting_sessions_channel_check');
    expect(migrationSource).toContain("'ONSITE', 'VISIT'");
    expect(migrationSource).toContain(
      'vote_participations_field_session_channel_check',
    );
    expect(migrationSource).toContain(
      "voting_channel = 'ONLINE' and field_voting_session_id is null",
    );
  });
});
