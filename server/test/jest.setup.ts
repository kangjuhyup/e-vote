import { createDatabaseEntityRegistry } from '../src/composition/database-entity.registry';
import { configureDatabaseEntityRegistryFactory } from '../src/platform/database/repository/database-repository.util';

configureDatabaseEntityRegistryFactory(createDatabaseEntityRegistry);
