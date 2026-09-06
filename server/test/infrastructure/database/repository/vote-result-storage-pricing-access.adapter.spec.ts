import type { EntityManager } from '@mikro-orm/postgresql';
import { VoteResultStoragePricingAccessAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/query/vote-result-storage-pricing-access.adapter';

describe('VoteResultStoragePricingAccessAdapter', () => {
  it('counts non-canceled vote details whose effective storage mode is blockchain', async () => {
    const execute = jest
      .fn<
        Promise<Array<{ count: string }>>,
        [string, readonly unknown[], 'all', string]
      >()
      .mockResolvedValue([{ count: '2' }]);
    const adapter = new VoteResultStoragePricingAccessAdapter({
      getConnection: () => ({ execute }),
      getTransactionContext: () => 'transaction-context',
    } as unknown as EntityManager);

    await expect(adapter.countBlockchainVoteDetails('vote-1')).resolves.toBe(2);

    expect(execute).toHaveBeenCalledWith(
      expect.any(String),
      ['vote-1'],
      'all',
      'transaction-context',
    );
    const sql = execute.mock.calls[0]?.[0];
    expect(sql).toContain('inner join "votes"');
    expect(sql).toContain('"vote_detail"."status" <> \'CANCELED\'');
    expect(sql).toContain('coalesce(');
    expect(sql).toContain('"result_storage_mode_override"');
    expect(sql).toContain('"default_result_storage_mode"');
    expect(sql).toContain("= 'BLOCKCHAIN'");
  });
});
