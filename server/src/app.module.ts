import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AttachmentTargetValidator } from './application/command/attachment-target.validator';
import { ConfirmAttachmentUploadHandler } from './application/command/handler/confirm-attachment-upload.handler';
import { CreateCandidateHandler } from './application/command/handler/create-candidate.handler';
import { CreateVoteDetailHandler } from './application/command/handler/create-vote-detail.handler';
import { CreateVoteHandler } from './application/command/handler/create-vote.handler';
import { RequestAttachmentUploadHandler } from './application/command/handler/request-attachment-upload.handler';
import { DATABASE_HEALTH_PORT } from './application/port/health/database-health.port';
import { GetCandidatePageHandler } from './application/query/handler/get-candidate-page.handler';
import { GetCandidateHandler } from './application/query/handler/get-candidate.handler';
import { GetElectorPageHandler } from './application/query/handler/get-elector-page.handler';
import { GetElectorHandler } from './application/query/handler/get-elector.handler';
import { GetVoteDetailPageHandler } from './application/query/handler/get-vote-detail-page.handler';
import { GetVoteDetailHandler } from './application/query/handler/get-vote-detail.handler';
import { GetVotePageHandler } from './application/query/handler/get-vote-page.handler';
import { GetVoteHandler } from './application/query/handler/get-vote.handler';
import { GetVoteResultHandler } from './application/query/handler/get-vote-result.handler';
import { GetVoteTurnoutHandler } from './application/query/handler/get-vote-turnout.handler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { NotConfiguredDatabaseHealthAdapter } from './infrastructure/database/not-configured-database-health.adapter';
import { RequestIdMiddleware } from './presentation/common/middleware/request-id.middleware';
import { CandidateAttachmentController } from './presentation/route/candidate/candidate-attachment.controller';
import { CandidateReadController } from './presentation/route/candidate/candidate-read.controller';
import { CandidateController } from './presentation/route/candidate/candidate.controller';
import { ElectorReadController } from './presentation/route/elector/elector-read.controller';
import { VoteDetailAttachmentController } from './presentation/route/vote-detail/vote-detail-attachment.controller';
import { VoteDetailReadController } from './presentation/route/vote-detail/vote-detail-read.controller';
import { VoteDetailController } from './presentation/route/vote-detail/vote-detail.controller';
import { VoteAttachmentController } from './presentation/route/vote/vote-attachment.controller';
import { VoteReadController } from './presentation/route/vote/vote-read.controller';
import { VoteController } from './presentation/route/vote/vote.controller';
import { VoteStatisticsController } from './presentation/route/vote-statistics/vote-statistics.controller';

@Module({
  imports: [InfrastructureModule],
  controllers: [
    AppController,
    VoteController,
    VoteReadController,
    VoteAttachmentController,
    VoteDetailController,
    VoteDetailReadController,
    VoteDetailAttachmentController,
    CandidateController,
    CandidateReadController,
    CandidateAttachmentController,
    ElectorReadController,
    VoteStatisticsController,
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
    GetVoteTurnoutHandler,
    GetVoteResultHandler,
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
