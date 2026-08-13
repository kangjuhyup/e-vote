import type { Options as PostgreSqlOptions } from '@mikro-orm/postgresql';
import { createDatabaseEntityRegistry } from './entity';

const DEFAULT_DATABASE_HOST = 'localhost';
const DEFAULT_DATABASE_PORT = 5432;
const DEFAULT_DATABASE_NAME = 'vote';
const DEFAULT_DATABASE_USER = 'postgres';
const DEFAULT_DATABASE_PASSWORD = 'postgres';

export function createDatabaseConfig(
  env: NodeJS.ProcessEnv = process.env,
): Promise<PostgreSqlOptions> {
  const sslEnabled = env.DATABASE_SSL === 'true';

  return Promise.all([
    createDatabaseEntityRegistry(),
    import('@mikro-orm/migrations'),
  ]).then(([{ databaseEntities }, { Migrator }]) => ({
    host: env.DATABASE_HOST ?? DEFAULT_DATABASE_HOST,
    port: Number(env.DATABASE_PORT ?? DEFAULT_DATABASE_PORT),
    dbName: env.DATABASE_NAME ?? DEFAULT_DATABASE_NAME,
    user: env.DATABASE_USER ?? DEFAULT_DATABASE_USER,
    password: env.DATABASE_PASSWORD ?? DEFAULT_DATABASE_PASSWORD,
    entities: databaseEntities,
    entitiesTs: databaseEntities,
    extensions: [Migrator],
    migrations: {
      path: './dist/infrastructure/database/migration',
      pathTs: './src/infrastructure/database/migration',
    },
    discovery: {
      warnWhenNoEntities: false,
    },
    ...(sslEnabled
      ? {
          driverOptions: {
            connection: {
              ssl: true,
            },
          },
        }
      : {}),
  }));
}
