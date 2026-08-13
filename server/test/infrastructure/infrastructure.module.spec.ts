import { MODULE_METADATA } from '@nestjs/common/constants';
import { InfrastructureModule } from '../../src/infrastructure/infrastructure.module';
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
  });

  it('exports infrastructure feature modules so application ports can use them', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      InfrastructureModule,
    ) as unknown[];

    expect(exports).toContain(RedisModule);
    expect(exports).toContain(StorageModule);
  });
});
