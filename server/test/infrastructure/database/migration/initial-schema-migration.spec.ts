import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDatabaseConfig } from '../../../../src/platform/database/database.config';

describe('initial schema migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260809000000.ts',
    ),
    'utf8',
  );

  it('creates every ERD table', () => {
    for (const tableName of [
      'votes',
      'vote_details',
      'electors',
      'candidates',
      'vote_participations',
      'vote_results',
      'files',
      'vote_attachments',
      'elector_attachments',
      'candidate_attachments',
      'elector_identity_verifications',
      'vote_content_change_histories',
      'vote_result_storage_records',
    ]) {
      expect(migrationSource).toContain(`create table "${tableName}"`);
    }
  });

  it('contains required ERD constraints that need SQL-level declarations', () => {
    expect(migrationSource).toContain('electors_vote_weight_positive_check');
    expect(migrationSource).toContain(
      'vote_participations_vote_detail_id_group_key_unique',
    );
    expect(migrationSource).toContain('where "group_key" is not null');
    expect(migrationSource).toContain(
      'vote_result_storage_records_blockchain_tx_hash_unique',
    );
    expect(migrationSource).toContain('where "blockchain_tx_hash" is not null');
    expect(migrationSource).toContain(
      'elector_attachments_elector_id_signature_unique',
    );
    expect(migrationSource).toContain(`where "type" = 'SIGNATURE'`);
    expect(migrationSource).toContain(
      'elector_identity_verifications_provider_transaction_unique',
    );
    expect(migrationSource).toContain(
      'where "provider_transaction_id" is not null',
    );
  });

  it('configures MikroORM migration paths inside infrastructure', async () => {
    const [{ Migrator }, config] = await Promise.all([
      import('@mikro-orm/migrations'),
      createDatabaseConfig({}),
    ]);

    expect(config.extensions).toEqual([Migrator]);
    expect(config).toMatchObject({
      migrations: {
        path: './dist/src/platform/database/migration',
        pathTs: './src/platform/database/migration',
      },
    });
  });
});
