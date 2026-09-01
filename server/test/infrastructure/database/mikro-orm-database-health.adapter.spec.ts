import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmDatabaseHealthAdapter } from '../../../src/platform/database/mikro-orm-database-health.adapter';

describe('MikroOrmDatabaseHealthAdapter', () => {
  it('returns up when PostgreSQL responds to the ping query', async () => {
    const execute = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const adapter = new MikroOrmDatabaseHealthAdapter(
      createEntityManager(execute),
    );

    await expect(adapter.ping()).resolves.toEqual({ status: 'up' });
    expect(execute).toHaveBeenCalledWith('select 1');
  });

  it('returns down with the database error when the ping query fails', async () => {
    const execute = jest
      .fn()
      .mockRejectedValue(new Error('database connection refused'));
    const adapter = new MikroOrmDatabaseHealthAdapter(
      createEntityManager(execute),
    );

    await expect(adapter.ping()).resolves.toEqual({
      status: 'down',
      reason: 'database connection refused',
    });
  });

  it('returns an unknown error reason for non-Error failures', async () => {
    const execute = jest.fn().mockRejectedValue('connection failed');
    const adapter = new MikroOrmDatabaseHealthAdapter(
      createEntityManager(execute),
    );

    await expect(adapter.ping()).resolves.toEqual({
      status: 'down',
      reason: 'unknown_error',
    });
  });
});

function createEntityManager(execute: jest.Mock): EntityManager {
  return {
    getConnection: () => ({ execute }),
  } as unknown as EntityManager;
}
