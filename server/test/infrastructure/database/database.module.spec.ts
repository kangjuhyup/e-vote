import { DatabaseModule } from '../../../src/infrastructure/database/database.module';
import {
  databaseRepositoryPortTokens,
  databaseRepositoryProviders,
} from '../../../src/infrastructure/database/database-repository.providers';

describe('DatabaseModule', () => {
  it('provides and exports repository port adapters', async () => {
    const moduleDefinition = await DatabaseModule.register();

    expect(moduleDefinition.providers).toEqual(
      expect.arrayContaining(databaseRepositoryProviders),
    );
    expect(moduleDefinition.exports).toEqual(
      expect.arrayContaining([...databaseRepositoryPortTokens]),
    );
  });
});
