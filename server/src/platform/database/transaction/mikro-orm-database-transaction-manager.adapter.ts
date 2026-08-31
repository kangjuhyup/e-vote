import { Injectable } from '@nestjs/common';
import {
  EntityManager,
  IsolationLevel,
  TransactionPropagation,
  type TransactionOptions,
} from '@mikro-orm/postgresql';
import {
  DEFAULT_DATABASE_TRANSACTION_PROPAGATION,
  type DatabaseTransactionIsolationLevel,
  type DatabaseTransactionManager,
  type DatabaseTransactionOptions,
  type DatabaseTransactionPropagation,
} from '../../../shared/application/port/persistence/transaction/database-transaction-manager.port';

@Injectable()
export class MikroOrmDatabaseTransactionManagerAdapter implements DatabaseTransactionManager {
  constructor(private readonly em: EntityManager) {}

  async runInTransaction<T>(
    work: () => Promise<T>,
    options: DatabaseTransactionOptions = {},
  ): Promise<T> {
    const canRetry =
      options.isolationLevel === 'serializable' && !this.em.isInTransaction();
    const maxAttempts = canRetry ? 3 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.em.transactional(async () => {
          const result = await work();

          return result;
        }, toMikroOrmTransactionOptions(options));
      } catch (error) {
        if (attempt === maxAttempts || !isRetryableTransactionError(error)) {
          throw error;
        }
      }
    }

    throw new Error('database transaction retry exhausted');
  }
}

function isRetryableTransactionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { readonly code?: unknown }).code;
  return code === '40001' || code === '40P01';
}

function toMikroOrmTransactionOptions(
  options: DatabaseTransactionOptions,
): TransactionOptions {
  const propagation =
    options.propagation ?? DEFAULT_DATABASE_TRANSACTION_PROPAGATION;

  return {
    propagation: toMikroOrmTransactionPropagation(propagation),
    ...(options.isolationLevel
      ? {
          isolationLevel: toMikroOrmIsolationLevel(options.isolationLevel),
        }
      : {}),
  };
}

function toMikroOrmTransactionPropagation(
  propagation: DatabaseTransactionPropagation,
): TransactionPropagation {
  switch (propagation) {
    case 'join-existing':
      return TransactionPropagation.REQUIRED;
    case 'requires-new':
      return TransactionPropagation.REQUIRES_NEW;
    default:
      throw new Error(
        `unsupported transaction propagation: ${String(propagation)}`,
      );
  }
}

function toMikroOrmIsolationLevel(
  isolationLevel: DatabaseTransactionIsolationLevel,
): IsolationLevel {
  switch (isolationLevel) {
    case 'read-uncommitted':
      return IsolationLevel.READ_UNCOMMITTED;
    case 'read-committed':
      return IsolationLevel.READ_COMMITTED;
    case 'repeatable-read':
      return IsolationLevel.REPEATABLE_READ;
    case 'serializable':
      return IsolationLevel.SERIALIZABLE;
    default:
      throw new Error(
        `unsupported transaction isolation level: ${String(isolationLevel)}`,
      );
  }
}
