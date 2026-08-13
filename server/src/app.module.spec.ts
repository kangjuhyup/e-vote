import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ATTACHMENT_REPOSITORY_PORT } from './application/port/attachment-repository.port';
import { CANDIDATE_READ_REPOSITORY_PORT } from './application/port/candidate-read-repository.port';
import { CANDIDATE_REPOSITORY_PORT } from './application/port/candidate-repository.port';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from './application/port/election-commission-repository.port';
import { ELECTOR_READ_REPOSITORY_PORT } from './application/port/elector-read-repository.port';
import { REDIS_HEALTH_PORT } from './application/port/redis-health.port';
import { STORAGE_PORT } from './application/port/storage.port';
import { STORAGE_HEALTH_PORT } from './application/port/storage-health.port';
import { VOTE_DETAIL_READ_REPOSITORY_PORT } from './application/port/vote-detail-read-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from './application/port/vote-detail-repository.port';
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
      provide: STORAGE_PORT,
      useValue: {
        createPresignedPutObjectUrl: jest.fn(),
        createPresignedGetObjectUrl: jest.fn(),
        createPresignedDeleteObjectUrl: jest.fn(),
        getObjectMetadata: jest.fn(),
      },
    },
    {
      provide: VOTE_REPOSITORY_PORT,
      useValue: {
        nextId: jest.fn(),
        findById: jest.fn(),
        save: jest.fn(),
      },
    },
    {
      provide: VOTE_DETAIL_REPOSITORY_PORT,
      useValue: {
        nextId: jest.fn(),
        findById: jest.fn(),
        save: jest.fn(),
      },
    },
    {
      provide: CANDIDATE_REPOSITORY_PORT,
      useValue: {
        nextId: jest.fn(),
        findById: jest.fn(),
        save: jest.fn(),
      },
    },
    {
      provide: ELECTION_COMMISSION_REPOSITORY_PORT,
      useValue: {
        nextId: jest.fn(),
        findById: jest.fn(),
        save: jest.fn(),
      },
    },
    {
      provide: VOTE_READ_REPOSITORY_PORT,
      useValue: {},
    },
    {
      provide: VOTE_DETAIL_READ_REPOSITORY_PORT,
      useValue: {},
    },
    {
      provide: CANDIDATE_READ_REPOSITORY_PORT,
      useValue: {},
    },
    {
      provide: ELECTOR_READ_REPOSITORY_PORT,
      useValue: {},
    },
    {
      provide: ATTACHMENT_REPOSITORY_PORT,
      useValue: {
        saveAttachedFile: jest.fn(),
      },
    },
  ],
  exports: [
    REDIS_HEALTH_PORT,
    STORAGE_HEALTH_PORT,
    STORAGE_PORT,
    VOTE_REPOSITORY_PORT,
    VOTE_DETAIL_REPOSITORY_PORT,
    CANDIDATE_REPOSITORY_PORT,
    ELECTION_COMMISSION_REPOSITORY_PORT,
    VOTE_READ_REPOSITORY_PORT,
    VOTE_DETAIL_READ_REPOSITORY_PORT,
    CANDIDATE_READ_REPOSITORY_PORT,
    ELECTOR_READ_REPOSITORY_PORT,
    ATTACHMENT_REPOSITORY_PORT,
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
