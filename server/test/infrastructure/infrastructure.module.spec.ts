import { MODULE_METADATA } from '@nestjs/common/constants';
import { InfrastructureModule } from '../../src/infrastructure/infrastructure.module';
import { RedisModule } from '../../src/infrastructure/redis/redis.module';

describe('InfrastructureModule', () => {
  it('imports the Redis module so its shutdown hooks participate in app shutdown', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      InfrastructureModule,
    ) as unknown[];

    expect(imports).toContain(RedisModule);
  });

  it('exports the Redis module so application ports can use Redis health', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      InfrastructureModule,
    ) as unknown[];

    expect(exports).toContain(RedisModule);
  });
});
