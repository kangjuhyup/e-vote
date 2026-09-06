import { Module } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ATTACHMENT_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/attachment-repository.port';
import { CANDIDATE_READ_REPOSITORY_PORT } from './modules/vote/application/port/persistence/query/candidate-read-repository.port';
import { CANDIDATE_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/candidate-repository.port';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from './modules/election-commission/application/port/persistence/command/election-commission-repository.port';
import { ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT } from './modules/election-commission/application/port/persistence/command/election-commission-member-repository.port';
import { ELECTORAL_ROLL_REPOSITORY_PORT } from './modules/electoral-roll/application/port/persistence/command/electoral-roll-repository.port';
import { ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT } from './modules/electoral-roll/application/port/persistence/command/electoral-roll-snapshot-repository.port';
import { ELECTOR_REPOSITORY_PORT } from './modules/elector/application/port/persistence/command/elector-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from './modules/field-voting/application/port/persistence/command/field-voting-session-repository.port';
import { ELECTION_COMMISSION_READ_REPOSITORY_PORT } from './modules/election-commission/application/port/persistence/query/election-commission-read-repository.port';
import { ELECTORAL_ROLL_READ_REPOSITORY_PORT } from './modules/electoral-roll/application/port/persistence/query/electoral-roll-read-repository.port';
import { FIELD_VOTING_SESSION_READ_REPOSITORY_PORT } from './modules/field-voting/application/port/persistence/query/field-voting-session-read-repository.port';
import { ELECTOR_READ_REPOSITORY_PORT } from './modules/elector/application/port/persistence/query/elector-read-repository.port';
import { DATABASE_TRANSACTION_MANAGER } from './shared/application/port/persistence/transaction/database-transaction-manager.port';
import { REDIS_HEALTH_PORT } from './shared/application/port/health/redis-health.port';
import { STORAGE_PORT } from './shared/application/port/gateway/storage.port';
import { STORAGE_HEALTH_PORT } from './shared/application/port/health/storage-health.port';
import { VOTE_DETAIL_READ_REPOSITORY_PORT } from './modules/vote/application/port/persistence/query/vote-detail-read-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/vote-detail-repository.port';
import { VOTE_READ_REPOSITORY_PORT } from './modules/vote/application/port/persistence/query/vote-read-repository.port';
import { VOTE_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/vote-repository.port';
import { VOTE_STATISTICS_READ_REPOSITORY_PORT } from './modules/participation/application/port/persistence/query/vote-statistics-read-repository.port';
import { AppModule } from './app.module';
import { PlatformModule } from './platform/platform.module';
import { VoteScheduleWorker } from './modules/vote/infrastructure/scheduling/vote-schedule.worker';
import { ParticipationController } from './modules/participation/presentation/participation/participation.controller';
import { ElectorSignatureController } from './modules/elector/presentation/elector/elector-signature.controller';
import { CastParticipationHandler } from './modules/participation/application/command/handler/cast-participation.handler';

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
      provide: ELECTORAL_ROLL_REPOSITORY_PORT,
      useValue: {
        nextId: jest.fn(),
        nextMemberId: jest.fn(),
        findById: jest.fn(),
        findMemberById: jest.fn(),
        findMembersByRollId: jest.fn(),
        save: jest.fn(),
        saveMember: jest.fn(),
        saveMembers: jest.fn(),
        removeMember: jest.fn(),
      },
    },
    {
      provide: ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
      useValue: {
        nextId: jest.fn(),
        nextMemberId: jest.fn(),
        findById: jest.fn(),
        findBySourceRevision: jest.fn(),
        save: jest.fn(),
        hasVoteElectors: jest.fn(),
        materializeVoteElectors: jest.fn(),
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
      provide: ELECTORAL_ROLL_READ_REPOSITORY_PORT,
      useValue: {},
    },
    {
      provide: DATABASE_TRANSACTION_MANAGER,
      useValue: { runInTransaction: jest.fn() },
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
    ELECTORAL_ROLL_REPOSITORY_PORT,
    ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
    ELECTOR_REPOSITORY_PORT,
    FIELD_VOTING_SESSION_REPOSITORY_PORT,
    ELECTION_COMMISSION_READ_REPOSITORY_PORT,
    ELECTORAL_ROLL_READ_REPOSITORY_PORT,
    DATABASE_TRANSACTION_MANAGER,
    FIELD_VOTING_SESSION_READ_REPOSITORY_PORT,
    VOTE_READ_REPOSITORY_PORT,
    VOTE_DETAIL_READ_REPOSITORY_PORT,
    CANDIDATE_READ_REPOSITORY_PORT,
    ELECTOR_READ_REPOSITORY_PORT,
    VOTE_STATISTICS_READ_REPOSITORY_PORT,
    ATTACHMENT_REPOSITORY_PORT,
  ],
})
class PlatformModuleStub {}

describe('AppModule', () => {
  it('registers signature upload and participation submission in the API root', () => {
    const controllers =
      (Reflect.getMetadata(
        MODULE_METADATA.CONTROLLERS,
        AppModule,
      ) as unknown[]) ?? [];
    const providers =
      (Reflect.getMetadata(
        MODULE_METADATA.PROVIDERS,
        AppModule,
      ) as unknown[]) ?? [];

    expect(controllers).toEqual(
      expect.arrayContaining([
        ElectorSignatureController,
        ParticipationController,
      ]),
    );
    expect(providers).toContain(CastParticipationHandler);
  });

  it('does not register background schedule polling in the API root', () => {
    const providers =
      (Reflect.getMetadata(
        MODULE_METADATA.PROVIDERS,
        AppModule,
      ) as unknown[]) ?? [];

    expect(providers).not.toContain(VoteScheduleWorker);
  });

  it('imports the platform module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(PlatformModule)
      .useModule(PlatformModuleStub)
      .compile();

    expect(moduleRef.get(AppModule)).toBeInstanceOf(AppModule);
  });
});
