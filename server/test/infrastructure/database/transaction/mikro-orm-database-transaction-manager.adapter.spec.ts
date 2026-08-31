import {
  IsolationLevel,
  TransactionPropagation,
  type EntityManager,
  type TransactionOptions,
} from '@mikro-orm/postgresql';
import type { DatabaseTransactionOptions } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import { MikroOrmDatabaseTransactionManagerAdapter } from '../../../../src/platform/database/transaction/mikro-orm-database-transaction-manager.adapter';

describe('MikroOrmDatabaseTransactionManagerAdapter', () => {
  it('delegates transaction execution to MikroORM EntityManager with join-existing as the default propagation', async () => {
    const events: string[] = [];
    const transactional = jest.fn<
      Promise<unknown>,
      [
        (work: () => Promise<unknown>) => Promise<unknown>,
        TransactionOptions | undefined,
      ]
    >(async (work) => {
      events.push('begin');
      const result = await work();
      events.push('commit');

      return result;
    });
    const em = {
      transactional,
      isInTransaction: jest.fn().mockReturnValue(false),
    } as unknown as EntityManager;
    const adapter = new MikroOrmDatabaseTransactionManagerAdapter(em);

    await expect(
      adapter.runInTransaction(async () => {
        await Promise.resolve();
        events.push('work');

        return 'saved';
      }),
    ).resolves.toBe('saved');

    expect(transactional).toHaveBeenCalledTimes(1);
    expect(transactional).toHaveBeenCalledWith(expect.any(Function), {
      propagation: TransactionPropagation.REQUIRED,
    });
    expect(events).toEqual(['begin', 'work', 'commit']);
  });

  it.each([
    [
      { propagation: 'join-existing' },
      {
        propagation: TransactionPropagation.REQUIRED,
      },
    ],
    [
      { propagation: 'requires-new' },
      {
        propagation: TransactionPropagation.REQUIRES_NEW,
      },
    ],
    [
      { propagation: 'requires-new', isolationLevel: 'read-committed' },
      {
        propagation: TransactionPropagation.REQUIRES_NEW,
        isolationLevel: IsolationLevel.READ_COMMITTED,
      },
    ],
    [
      { propagation: 'join-existing', isolationLevel: 'serializable' },
      {
        propagation: TransactionPropagation.REQUIRED,
        isolationLevel: IsolationLevel.SERIALIZABLE,
      },
    ],
  ] satisfies [DatabaseTransactionOptions, TransactionOptions][])(
    'maps database transaction options %p to MikroORM options',
    async (databaseOptions, mikroOrmOptions) => {
      const transactional = jest.fn<
        Promise<unknown>,
        [
          (work: () => Promise<unknown>) => Promise<unknown>,
          TransactionOptions | undefined,
        ]
      >(async (work) => {
        const result = await work();

        return result;
      });
      const em = {
        transactional,
        isInTransaction: jest.fn().mockReturnValue(false),
      } as unknown as EntityManager;
      const adapter = new MikroOrmDatabaseTransactionManagerAdapter(em);

      await expect(
        adapter.runInTransaction(async () => {
          await Promise.resolve();

          return 'mapped';
        }, databaseOptions),
      ).resolves.toBe('mapped');

      expect(transactional).toHaveBeenCalledWith(
        expect.any(Function),
        mikroOrmOptions,
      );
    },
  );

  it('retries a top-level serializable transaction after a serialization failure', async () => {
    const serializationFailure = Object.assign(new Error('retry'), {
      code: '40001',
    });
    const transactional = jest
      .fn<
        Promise<string>,
        [() => Promise<string>, TransactionOptions | undefined]
      >()
      .mockRejectedValueOnce(serializationFailure)
      .mockImplementation(async (work) => work());
    const em = {
      transactional,
      isInTransaction: jest.fn().mockReturnValue(false),
    } as unknown as EntityManager;
    const adapter = new MikroOrmDatabaseTransactionManagerAdapter(em);

    await expect(
      adapter.runInTransaction(
        async () => {
          await Promise.resolve();
          return 'saved';
        },
        {
          isolationLevel: 'serializable',
        },
      ),
    ).resolves.toBe('saved');
    expect(transactional).toHaveBeenCalledTimes(2);
  });
});
