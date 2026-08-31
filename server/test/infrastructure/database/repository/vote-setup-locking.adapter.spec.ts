import type { EntityManager } from '@mikro-orm/postgresql';
import { VoteRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/command/vote-repository.adapter';

describe('VoteRepositoryAdapter setup locking', () => {
  it('locks the parent vote row in the active transaction context', async () => {
    const transactionContext = {};
    const execute = jest.fn().mockResolvedValue([{ id: 'vote-1' }]);
    const context = {
      getConnection: () => ({ execute }),
      getTransactionContext: () => transactionContext,
    };
    const em = {
      getContext: () => context,
    } as unknown as EntityManager;

    await new VoteRepositoryAdapter(em).lockVote('vote-1');

    expect(execute.mock.calls).toEqual([
      [
        'select "id" from "votes" where "id" = ? for update',
        ['vote-1'],
        'all',
        transactionContext,
      ],
    ]);
  });

  it('reports a missing vote after attempting the row lock', async () => {
    const context = {
      getConnection: () => ({ execute: jest.fn().mockResolvedValue([]) }),
      getTransactionContext: () => ({}),
    };
    const em = {
      getContext: () => context,
    } as unknown as EntityManager;

    await expect(
      new VoteRepositoryAdapter(em).lockVote('missing-vote'),
    ).rejects.toThrow('vote not found');
  });
});
