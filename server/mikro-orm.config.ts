import type { Options as PostgreSqlOptions } from '@mikro-orm/postgresql';
import { createDatabaseConfig } from './src/platform/database/database.config';
import { createDatabaseEntityRegistry } from './src/composition/persistence/database-entity.registry';

const config = (async (): Promise<PostgreSqlOptions> => {
  const { PostgreSqlDriver } = await import('@mikro-orm/postgresql');
  const databaseConfig = await createDatabaseConfig(
    process.env,
    createDatabaseEntityRegistry,
  );

  return {
    ...databaseConfig,
    driver: PostgreSqlDriver,
  };
})();

export default config;
