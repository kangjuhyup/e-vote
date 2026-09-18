import { MikroORM } from '@mikro-orm/postgresql';
import { createDatabaseEntityRegistry } from './composition/persistence/database-entity.registry';
import { createDatabaseConfig } from './platform/database/database.config';

async function migrate(): Promise<void> {
  const options = await createDatabaseConfig(
    process.env,
    createDatabaseEntityRegistry,
  );
  const orm = await MikroORM.init(options);

  try {
    await orm.migrator.up();
  } finally {
    await orm.close(true);
  }
}

void migrate().catch(() => {
  console.error('Database migration failed');
  process.exitCode = 1;
});
