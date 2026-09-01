import { DatabaseModule } from '../../../src/platform/database/database.module';
import {
  databaseRepositoryPortTokens,
  databaseRepositoryProviders,
} from '../../../src/composition/database-repository.providers';
import {
  databaseTransactionPortTokens,
  databaseTransactionProviders,
} from '../../../src/platform/database/database-transaction.providers';
import { createDatabaseEntityRegistry } from '../../../src/composition/database-entity.registry';
import { DATABASE_HEALTH_PORT } from '../../../src/shared/application/port/health/database-health.port';
import { MikroOrmDatabaseHealthAdapter } from '../../../src/platform/database/mikro-orm-database-health.adapter';

describe('DatabaseModule', () => {
  it('provides and exports repository port adapters', async () => {
    const moduleDefinition = await DatabaseModule.register({
      entityRegistryFactory: createDatabaseEntityRegistry,
      repositoryProviders: databaseRepositoryProviders,
      repositoryPortTokens: databaseRepositoryPortTokens,
    });

    expect(moduleDefinition.providers).toEqual(
      expect.arrayContaining(databaseRepositoryProviders),
    );
    expect(moduleDefinition.providers).toEqual(
      expect.arrayContaining(databaseTransactionProviders),
    );
    expect(moduleDefinition.exports).toEqual(
      expect.arrayContaining([...databaseRepositoryPortTokens]),
    );
    expect(moduleDefinition.exports).toEqual(
      expect.arrayContaining([...databaseTransactionPortTokens]),
    );
    expect(moduleDefinition.providers).toContainEqual({
      provide: DATABASE_HEALTH_PORT,
      useClass: MikroOrmDatabaseHealthAdapter,
    });
    expect(moduleDefinition.exports).toContain(DATABASE_HEALTH_PORT);
  });
});
