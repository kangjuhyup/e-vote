export const DATABASE_TRANSACTION_MANAGER = Symbol(
  'DATABASE_TRANSACTION_MANAGER',
);

export const DEFAULT_DATABASE_TRANSACTION_PROPAGATION = 'join-existing';

export type DatabaseTransactionPropagation =
  typeof DEFAULT_DATABASE_TRANSACTION_PROPAGATION | 'requires-new';

export type DatabaseTransactionIsolationLevel =
  'read-uncommitted' | 'read-committed' | 'repeatable-read' | 'serializable';

export type DatabaseTransactionOptions = {
  readonly propagation?: DatabaseTransactionPropagation;
  readonly isolationLevel?: DatabaseTransactionIsolationLevel;
};

export interface DatabaseTransactionManager {
  runInTransaction<T>(
    work: () => Promise<T>,
    options?: DatabaseTransactionOptions,
  ): Promise<T>;
}
