import type {
  DatabaseTransactionManager,
  DatabaseTransactionOptions,
} from '../../port/persistence/transaction/database-transaction-manager.port';

export const DATABASE_TRANSACTION_MANAGER_PROPERTY = Symbol(
  'DATABASE_TRANSACTION_MANAGER_PROPERTY',
);

export type DatabaseTransactionalHost = {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;
};

export type TransactionalOptions = DatabaseTransactionOptions & {
  readonly managerProperty?: PropertyKey;
};

type TransactionalMethod = (this: unknown, ...args: unknown[]) => unknown;

export function Transactional(
  options: TransactionalOptions = {},
): MethodDecorator {
  const managerProperty =
    options.managerProperty ?? DATABASE_TRANSACTION_MANAGER_PROPERTY;
  const transactionOptions = toDatabaseTransactionOptions(options);

  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const original = descriptor.value as unknown;

    if (typeof original !== 'function') {
      throw new TypeError('@Transactional can only decorate methods');
    }

    descriptor.value = async function (
      this: Record<PropertyKey, unknown>,
      ...args: unknown[]
    ): Promise<unknown> {
      const transactionManager = this[managerProperty];

      if (!isDatabaseTransactionManager(transactionManager)) {
        throw new Error('database transaction manager is not configured');
      }

      const originalMethod = original as TransactionalMethod;

      return transactionManager.runInTransaction(async () => {
        const result = await Promise.resolve(
          originalMethod.apply(this, args) as unknown,
        );

        return result;
      }, transactionOptions);
    };

    return descriptor;
  };
}

function toDatabaseTransactionOptions(
  options: TransactionalOptions,
): DatabaseTransactionOptions {
  return {
    ...(options.propagation ? { propagation: options.propagation } : {}),
    ...(options.isolationLevel
      ? { isolationLevel: options.isolationLevel }
      : {}),
  };
}

function isDatabaseTransactionManager(
  value: unknown,
): value is DatabaseTransactionManager {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    readonly runInTransaction?: unknown;
  };

  return typeof candidate.runInTransaction === 'function';
}
