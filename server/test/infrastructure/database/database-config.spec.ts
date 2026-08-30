import { createDatabaseConfig } from '../../../src/platform/database/database.config';
import { createDatabaseEntityRegistry } from '../../../src/composition/database-entity.registry';

describe('database config', () => {
  it('maps environment variables to PostgreSQL MikroORM options', async () => {
    const config = await createDatabaseConfig(
      {
        DATABASE_HOST: 'db.example.test',
        DATABASE_PORT: '15432',
        DATABASE_NAME: 'vote_test',
        DATABASE_USER: 'vote_user',
        DATABASE_PASSWORD: 'vote_password',
        DATABASE_SSL: 'false',
      },
      createDatabaseEntityRegistry,
    );

    expect(config).toMatchObject({
      host: 'db.example.test',
      port: 15432,
      dbName: 'vote_test',
      user: 'vote_user',
      password: 'vote_password',
      discovery: {
        warnWhenNoEntities: false,
      },
    });
    expect(config.entities).toHaveLength(27);
    expect(config.entitiesTs).toBe(config.entities);
  });

  it('uses local development defaults when environment variables are missing', async () => {
    const config = await createDatabaseConfig({}, createDatabaseEntityRegistry);

    expect(config).toMatchObject({
      host: 'localhost',
      port: 5432,
      dbName: 'vote',
      user: 'postgres',
      password: 'postgres',
    });
  });

  it('enables SSL only when DATABASE_SSL is true', async () => {
    const config = await createDatabaseConfig(
      { DATABASE_SSL: 'true' },
      createDatabaseEntityRegistry,
    );

    expect(config.driverOptions).toEqual({
      connection: {
        ssl: true,
      },
    });
  });

  it('allows empty entity lists while persistence entities are out of scope', async () => {
    const config = await createDatabaseConfig({}, createDatabaseEntityRegistry);

    expect(config.discovery).toEqual({
      warnWhenNoEntities: false,
    });
  });
});
