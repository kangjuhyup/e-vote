import mikroOrmConfig from '../../../mikro-orm.config';
import { createDatabaseConfig } from '../../../src/platform/database/database.config';
import { createDatabaseEntityRegistry } from '../../../src/composition/persistence/database-entity.registry';

describe('mikro orm cli config', () => {
  it('reuses the database config mapping and attaches the PostgreSQL driver', async () => {
    const [{ PostgreSqlDriver }, config, databaseConfig] = await Promise.all([
      import('@mikro-orm/postgresql'),
      mikroOrmConfig,
      createDatabaseConfig(process.env, createDatabaseEntityRegistry),
    ]);

    expect(config).toMatchObject(databaseConfig);
    expect(config.driver).toBe(PostgreSqlDriver);
  });
});
