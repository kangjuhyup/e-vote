import { createDatabaseEntityRegistry } from '../src/composition/persistence/database-entity.registry';
import { configureDatabaseEntityRegistryFactory } from '../src/platform/database/repository/database-repository.util';

process.env.VOTE_AUTH_INTROSPECTION_CLIENT_SECRET ??=
  'vote-test-introspection-secret';

configureDatabaseEntityRegistryFactory(createDatabaseEntityRegistry);
