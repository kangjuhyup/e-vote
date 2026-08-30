import { VoteElectorCountAccessAdapter } from '../../../../src/modules/elector/infrastructure/database/repository/query/vote-elector-count-access.adapter';

describe('VoteElectorCountAccessAdapter', () => {
  it('counts only eligible electors in the target vote', async () => {
    const count = jest
      .fn<Promise<number>, [unknown, unknown]>()
      .mockResolvedValue(120);
    const adapter = new VoteElectorCountAccessAdapter({ count } as any);

    await expect(adapter.countEligibleElectors('vote-1')).resolves.toBe(120);
    expect(count.mock.calls[0]?.[1]).toEqual({
      vote: { id: 'vote-1' },
      status: 'ELIGIBLE',
    });
  });
});
