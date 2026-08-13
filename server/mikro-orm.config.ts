import type { Options as PostgreSqlOptions } from '@mikro-orm/postgresql';
import { createDatabaseConfig } from './src/infrastructure/database/database.config';

const config = (async (): Promise<PostgreSqlOptions> => {
  const { PostgreSqlDriver } = await import('@mikro-orm/postgresql');
  const databaseConfig = await createDatabaseConfig();

  return {
    ...databaseConfig,
    driver: PostgreSqlDriver,
  };
})();

export default config;
