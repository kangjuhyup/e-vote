import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('SMS dispatch history migration', () => {
  const source = readFileSync(
    join(
      process.cwd(),
      'src/platform/database/migration/Migration20260830020000.ts',
    ),
    'utf8',
  );

  it('creates constrained dispatch summary and recipient delivery tables', () => {
    expect(source).toContain('create table "sms_dispatches"');
    expect(source).toContain('create table "sms_deliveries"');
    expect(source).toContain('sms_dispatches_counts_check');
    expect(source).toContain('sms_dispatches_field_session_check');
    expect(source).toContain('sms_deliveries_failure_reason_check');
    expect(source).toContain('sms_dispatches_vote_id_sent_at_index');
    expect(source).not.toContain('phone_number');
    expect(source).not.toContain('message_body');
  });
});
