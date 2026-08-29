import { MODULE_METADATA } from '@nestjs/common/constants';
import { DatabaseModule } from '../../src/infrastructure/database/database.module';
import { InfrastructureModule } from '../../src/infrastructure/infrastructure.module';
import { LoggingModule } from '../../src/infrastructure/logging/logging.module';
import { RedisModule } from '../../src/infrastructure/redis/redis.module';
import { StorageModule } from '../../src/infrastructure/storage/storage.module';

describe('InfrastructureModule', () => {
  it('imports infrastructure feature modules', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      InfrastructureModule,
    ) as unknown[];

    expect(imports).toContain(RedisModule);
    expect(imports).toContain(StorageModule);
    expect(imports).toContain(LoggingModule);
  });

  it('exports infrastructure feature modules so application ports can use them', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      InfrastructureModule,
    ) as unknown[];

    expect(exports).toContain(DatabaseModule);
    expect(exports).toContain(RedisModule);
    expect(exports).toContain(StorageModule);
    expect(exports).toContain(LoggingModule);
  });
});
