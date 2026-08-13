import type { Provider } from '@nestjs/common';
import { DATABASE_TRANSACTION_MANAGER } from './transaction/database-transaction-manager.port';
import { MikroOrmDatabaseTransactionManagerAdapter } from './transaction/mikro-orm-database-transaction-manager.adapter';

export const databaseTransactionProviders: Provider[] = [
  {
    provide: DATABASE_TRANSACTION_MANAGER,
    useClass: MikroOrmDatabaseTransactionManagerAdapter,
  },
];

export const databaseTransactionPortTokens = [
  DATABASE_TRANSACTION_MANAGER,
] as const;
