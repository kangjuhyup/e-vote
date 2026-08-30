import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ATTACHMENT_REPOSITORY_PORT } from './application/port/persistence/command/attachment-repository.port';
import { CANDIDATE_READ_REPOSITORY_PORT } from './application/port/persistence/query/candidate-read-repository.port';
import { CANDIDATE_REPOSITORY_PORT } from './application/port/persistence/command/candidate-repository.port';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from './application/port/persistence/command/election-commission-repository.port';
import { ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT } from './application/port/persistence/command/election-commission-member-repository.port';
import { ELECTOR_REPOSITORY_PORT } from './application/port/persistence/command/elector-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from './application/port/persistence/command/field-voting-session-repository.port';
import { ELECTION_COMMISSION_READ_REPOSITORY_PORT } from './application/port/persistence/query/election-commission-read-repository.port';
import { FIELD_VOTING_SESSION_READ_REPOSITORY_PORT } from './application/port/persistence/query/field-voting-session-read-repository.port';
import { ELECTOR_READ_REPOSITORY_PORT } from './application/port/persistence/query/elector-read-repository.port';
import { REDIS_HEALTH_PORT } from './application/port/health/redis-health.port';
import { STORAGE_PORT } from './application/port/gateway/storage.port';
import { STORAGE_HEALTH_PORT } from './application/port/health/storage-health.port';
import { VOTE_DETAIL_READ_REPOSITORY_PORT } from './application/port/persistence/query/vote-detail-read-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from './application/port/persistence/command/vote-detail-repository.port';
import { VOTE_READ_REPOSITORY_PORT } from './application/port/persistence/query/vote-read-repository.port';
import { VOTE_REPOSITORY_PORT } from './application/port/persistence/command/vote-repository.port';
import { VOTE_STATISTICS_READ_REPOSITORY_PORT } from './application/port/persistence/query/vote-statistics-read-repository.port';
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
      provide: ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT,
      useValue: {
        nextId: jest.fn(),
        findById: jest.fn(),
        findByIds: jest.fn(),
        save: jest.fn(),
      },
    },
    {
      provide: ELECTOR_REPOSITORY_PORT,
      useValue: { nextId: jest.fn(), findById: jest.fn(), save: jest.fn() },
    },
    {
      provide: FIELD_VOTING_SESSION_REPOSITORY_PORT,
      useValue: { nextId: jest.fn(), findById: jest.fn(), save: jest.fn() },
    },
    {
      provide: ELECTION_COMMISSION_READ_REPOSITORY_PORT,
      useValue: {},
    },
    {
      provide: FIELD_VOTING_SESSION_READ_REPOSITORY_PORT,
      useValue: {},
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
      provide: VOTE_STATISTICS_READ_REPOSITORY_PORT,
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
    ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT,
    ELECTOR_REPOSITORY_PORT,
    FIELD_VOTING_SESSION_REPOSITORY_PORT,
    ELECTION_COMMISSION_READ_REPOSITORY_PORT,
    FIELD_VOTING_SESSION_READ_REPOSITORY_PORT,
    VOTE_READ_REPOSITORY_PORT,
    VOTE_DETAIL_READ_REPOSITORY_PORT,
    CANDIDATE_READ_REPOSITORY_PORT,
    ELECTOR_READ_REPOSITORY_PORT,
    VOTE_STATISTICS_READ_REPOSITORY_PORT,
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
