import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from './application/port/election-commission-repository.port';
import { REDIS_HEALTH_PORT } from './application/port/redis-health.port';
import { STORAGE_HEALTH_PORT } from './application/port/storage-health.port';
import { VOTE_READ_REPOSITORY_PORT } from './application/port/vote-read-repository.port';
import { VOTE_REPOSITORY_PORT } from './application/port/vote-repository.port';
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
    {
      provide: ELECTION_COMMISSION_REPOSITORY_PORT,
      useValue: {},
    },
    {
      provide: VOTE_REPOSITORY_PORT,
      useValue: {},
    },
    {
      provide: VOTE_READ_REPOSITORY_PORT,
      useValue: {},
    },
  ],
  exports: [
    REDIS_HEALTH_PORT,
    STORAGE_HEALTH_PORT,
    ELECTION_COMMISSION_REPOSITORY_PORT,
    VOTE_REPOSITORY_PORT,
    VOTE_READ_REPOSITORY_PORT,
  ],
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
