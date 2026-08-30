import { DatabaseModule } from '../../src/platform/database/database.module';
import { PlatformModule } from '../../src/platform/platform.module';
import { LoggingModule } from '../../src/platform/logging/logging.module';
import { RedisModule } from '../../src/platform/redis/redis.module';
import { StorageModule } from '../../src/platform/storage/storage.module';

describe('PlatformModule', () => {
  it('imports infrastructure feature modules', () => {
    const imports = PlatformModule.register({
      entityRegistryFactory: () => Promise.resolve({ databaseEntities: [] }),
    }).imports as unknown[];

    expect(imports).toContain(RedisModule);
    expect(imports).toContain(StorageModule);
    expect(imports).toContain(LoggingModule);
  });

  it('exports infrastructure feature modules so application ports can use them', () => {
    const exports = PlatformModule.register({
      entityRegistryFactory: () => Promise.resolve({ databaseEntities: [] }),
    }).exports as unknown[];

    expect(exports).toContain(DatabaseModule);
    expect(exports).toContain(RedisModule);
    expect(exports).toContain(StorageModule);
    expect(exports).toContain(LoggingModule);
  });
});
