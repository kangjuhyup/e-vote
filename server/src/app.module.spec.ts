import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { REDIS_HEALTH_PORT } from './application/port/redis-health.port';
import { STORAGE_HEALTH_PORT } from './application/port/storage-health.port';
import { AppModule } from './app.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

@Module({
  providers: [
    {
      provide: REDIS_HEALTH_PORT,
      useValue: {
        ping: jest.fn(),
      },
    },
    {
      provide: STORAGE_HEALTH_PORT,
      useValue: {
        ping: jest.fn(),
      },
    },
  ],
  exports: [REDIS_HEALTH_PORT, STORAGE_HEALTH_PORT],
})
class InfrastructureModuleStub {}

describe('AppModule', () => {
  it('imports the infrastructure module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(InfrastructureModule)
      .useModule(InfrastructureModuleStub)
      .compile();

    expect(moduleRef.get(AppModule)).toBeInstanceOf(AppModule);
  });
});
