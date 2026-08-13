import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AttachmentTargetValidator } from './application/command/attachment-target.validator';
import { ConfirmAttachmentUploadHandler } from './application/command/confirm-attachment-upload.handler';
import { CreateCandidateHandler } from './application/command/create-candidate.handler';
import { CreateVoteDetailHandler } from './application/command/create-vote-detail.handler';
import { CreateVoteHandler } from './application/command/create-vote.handler';
import { RequestAttachmentUploadHandler } from './application/command/request-attachment-upload.handler';
import { DATABASE_HEALTH_PORT } from './application/port/database-health.port';
import { GetCandidatePageHandler } from './application/query/get-candidate-page.handler';
import { GetCandidateHandler } from './application/query/get-candidate.handler';
import { GetElectorPageHandler } from './application/query/get-elector-page.handler';
import { GetElectorHandler } from './application/query/get-elector.handler';
import { GetVoteDetailPageHandler } from './application/query/get-vote-detail-page.handler';
import { GetVoteDetailHandler } from './application/query/get-vote-detail.handler';
import { GetVotePageHandler } from './application/query/get-vote-page.handler';
import { GetVoteHandler } from './application/query/get-vote.handler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { NotConfiguredDatabaseHealthAdapter } from './infrastructure/database/not-configured-database-health.adapter';
import { RequestIdMiddleware } from './presentation/common/middleware/request-id.middleware';
import { CandidateController } from './presentation/route/candidate/candidate.controller';
import { ElectorReadController } from './presentation/route/elector/elector-read.controller';
import { VoteDetailController } from './presentation/route/vote-detail/vote-detail.controller';
import { VoteController } from './presentation/route/vote/vote.controller';

@Module({
  imports: [InfrastructureModule],
  controllers: [
    AppController,
    VoteController,
    VoteDetailController,
    CandidateController,
    ElectorReadController,
  ],
  providers: [
    AppService,
    AttachmentTargetValidator,
    CreateVoteHandler,
    CreateVoteDetailHandler,
    CreateCandidateHandler,
    RequestAttachmentUploadHandler,
    ConfirmAttachmentUploadHandler,
    GetVoteHandler,
    GetVotePageHandler,
    GetVoteDetailHandler,
    GetVoteDetailPageHandler,
    GetCandidateHandler,
    GetCandidatePageHandler,
    GetElectorHandler,
    GetElectorPageHandler,
    {
      provide: DATABASE_HEALTH_PORT,
      useClass: NotConfiguredDatabaseHealthAdapter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
