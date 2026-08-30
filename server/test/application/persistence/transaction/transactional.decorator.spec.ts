import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  DatabaseTransactionManager,
  DatabaseTransactionOptions,
} from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
  type DatabaseTransactionalHost,
} from '../../../../src/shared/application/persistence/transaction/transactional.decorator';

describe('Transactional decorator', () => {
  it('runs the decorated method through the configured transaction manager', async () => {
    const events: string[] = [];
    const runInTransaction = jest.fn<
      Promise<unknown>,
      [() => Promise<unknown>, DatabaseTransactionOptions | undefined]
    >(async (work) => {
      events.push('begin');
      const result = await work();
      events.push('commit');

      return result;
    });
    const transactionManager: DatabaseTransactionManager = {
      runInTransaction: <T>(
        work: () => Promise<T>,
        options?: DatabaseTransactionOptions,
      ): Promise<T> => runInTransaction(work, options) as Promise<T>,
    };

    class DecoratedService implements DatabaseTransactionalHost {
      readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;

      @Transactional()
      async execute(value: string): Promise<string> {
        await Promise.resolve();
        events.push(`execute:${value}`);

        return `result:${value}`;
      }
    }

    await expect(new DecoratedService().execute('vote-1')).resolves.toBe(
      'result:vote-1',
    );
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(runInTransaction).toHaveBeenCalledWith(expect.any(Function), {});
    expect(events).toEqual(['begin', 'execute:vote-1', 'commit']);
  });

  it('passes transaction options to the configured transaction manager', async () => {
    const runInTransaction = jest.fn<
      Promise<unknown>,
      [() => Promise<unknown>, DatabaseTransactionOptions | undefined]
    >(async (work) => {
      const result = await work();

      return result;
    });
    const transactionManager: DatabaseTransactionManager = {
      runInTransaction: <T>(
        work: () => Promise<T>,
        options?: DatabaseTransactionOptions,
      ): Promise<T> => runInTransaction(work, options) as Promise<T>,
    };

    class DecoratedService implements DatabaseTransactionalHost {
      readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;

      @Transactional({
        propagation: 'requires-new',
        isolationLevel: 'serializable',
      })
      async execute(): Promise<string> {
        await Promise.resolve();

        return 'committed';
      }
    }

    await expect(new DecoratedService().execute()).resolves.toBe('committed');
    expect(runInTransaction).toHaveBeenCalledWith(expect.any(Function), {
      propagation: 'requires-new',
      isolationLevel: 'serializable',
    });
  });

  it('fails fast when the host does not expose a transaction manager', async () => {
    class MissingTransactionManager {
      @Transactional()
      async execute(): Promise<string> {
        await Promise.resolve();

        return 'unreachable';
      }
    }

    await expect(new MissingTransactionManager().execute()).rejects.toThrow(
      'database transaction manager is not configured',
    );
  });

  it('does not depend on a concrete ORM package', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src/shared/application/persistence/transaction/transactional.decorator.ts',
      ),
      'utf8',
    );

    expect(source).not.toContain('@mikro-orm');
  });
});
