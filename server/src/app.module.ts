import { Module } from '@nestjs/common';
import { AttachmentTargetValidator } from './application/command/attachment-target.validator';
import { ConfirmAttachmentUploadHandler } from './application/command/handler/confirm-attachment-upload.handler';
import { AddElectoralRollMemberHandler } from './application/command/handler/add-electoral-roll-member.handler';
import { AttachElectoralRollSnapshotHandler } from './application/command/handler/attach-electoral-roll-snapshot.handler';
import { AuthenticateElectorHandler } from './application/command/handler/authenticate-elector.handler';
import { BlockElectorHandler } from './application/command/handler/block-elector.handler';
import { CancelFieldVotingSessionHandler } from './application/command/handler/cancel-field-voting-session.handler';
import { ChangeVoteDetailStatusHandler } from './application/command/handler/change-vote-detail-status.handler';
import { ChangeVoteStatusHandler } from './application/command/handler/change-vote-status.handler';
import { CloseFieldVotingSessionHandler } from './application/command/handler/close-field-voting-session.handler';
import { CreateCandidateHandler } from './application/command/handler/create-candidate.handler';
import { CreateElectionCommissionHandler } from './application/command/handler/create-election-commission.handler';
import { CreateElectoralRollHandler } from './application/command/handler/create-electoral-roll.handler';
import { CreateElectoralRollSnapshotHandler } from './application/command/handler/create-electoral-roll-snapshot.handler';
import { CreateElectorHandler } from './application/command/handler/create-elector.handler';
import { CreateFieldVotingSessionHandler } from './application/command/handler/create-field-voting-session.handler';
import { CreateVoteDetailHandler } from './application/command/handler/create-vote-detail.handler';
import { CreateVoteHandler } from './application/command/handler/create-vote.handler';
import { OpenFieldVotingSessionHandler } from './application/command/handler/open-field-voting-session.handler';
import { RegisterElectionCommissionMemberHandler } from './application/command/handler/register-election-commission-member.handler';
import { RemoveElectoralRollMemberHandler } from './application/command/handler/remove-electoral-roll-member.handler';
import { RequestAttachmentUploadHandler } from './application/command/handler/request-attachment-upload.handler';
import { UpdateCandidateHandler } from './application/command/handler/update-candidate.handler';
import { UpdateElectoralRollMemberHandler } from './application/command/handler/update-electoral-roll-member.handler';
import { UpdateElectorHandler } from './application/command/handler/update-elector.handler';
import { UpdateVoteDetailHandler } from './application/command/handler/update-vote-detail.handler';
import { UpdateVoteHandler } from './application/command/handler/update-vote.handler';
import { WithdrawCandidateHandler } from './application/command/handler/withdraw-candidate.handler';
import { ELECTOR_IDENTITY_VERIFICATION_PORT } from './application/port/gateway/elector-identity-verification.port';
import { DATABASE_HEALTH_PORT } from './application/port/health/database-health.port';
import { GetCandidatePageHandler } from './application/query/handler/get-candidate-page.handler';
import { GetCandidateHandler } from './application/query/handler/get-candidate.handler';
import { GetElectionCommissionHandler } from './application/query/handler/get-election-commission.handler';
import { GetElectionCommissionPageHandler } from './application/query/handler/get-election-commission-page.handler';
import { GetElectoralRollHandler } from './application/query/handler/get-electoral-roll.handler';
import { GetFieldVotingSessionHandler } from './application/query/handler/get-field-voting-session.handler';
import { GetFieldVotingSessionPageHandler } from './application/query/handler/get-field-voting-session-page.handler';
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
import { NotConfiguredElectorIdentityVerificationAdapter } from './infrastructure/security/not-configured-elector-identity-verification.adapter';
import { CandidateAttachmentController } from './presentation/route/candidate/candidate-attachment.controller';
import { CandidateReadController } from './presentation/route/candidate/candidate-read.controller';
import { CandidateController } from './presentation/route/candidate/candidate.controller';
import { ElectionCommissionReadController } from './presentation/route/election-commission/election-commission-read.controller';
import { ElectionCommissionController } from './presentation/route/election-commission/election-commission.controller';
import { ElectoralRollController } from './presentation/route/electoral-roll/electoral-roll.controller';
import { ElectoralRollReadController } from './presentation/route/electoral-roll/electoral-roll-read.controller';
import { ElectorController } from './presentation/route/elector/elector.controller';
import { FieldVotingSessionReadController } from './presentation/route/field-voting-session/field-voting-session-read.controller';
import { FieldVotingSessionController } from './presentation/route/field-voting-session/field-voting-session.controller';
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
    ElectionCommissionReadController,
    ElectionCommissionController,
    ElectoralRollController,
    ElectoralRollReadController,
    ElectorController,
    FieldVotingSessionReadController,
    FieldVotingSessionController,
    ElectorReadController,
    VoteStatisticsController,
  ],
  providers: [
    AppService,
    AttachmentTargetValidator,
    CreateVoteHandler,
    CreateVoteDetailHandler,
    CreateCandidateHandler,
    CreateElectionCommissionHandler,
    RegisterElectionCommissionMemberHandler,
    CreateElectoralRollHandler,
    AddElectoralRollMemberHandler,
    UpdateElectoralRollMemberHandler,
    RemoveElectoralRollMemberHandler,
    CreateElectoralRollSnapshotHandler,
    AttachElectoralRollSnapshotHandler,
    CreateElectorHandler,
    AuthenticateElectorHandler,
    CreateFieldVotingSessionHandler,
    OpenFieldVotingSessionHandler,
    CloseFieldVotingSessionHandler,
    CancelFieldVotingSessionHandler,
    UpdateVoteHandler,
    ChangeVoteStatusHandler,
    UpdateVoteDetailHandler,
    ChangeVoteDetailStatusHandler,
    UpdateCandidateHandler,
    WithdrawCandidateHandler,
    UpdateElectorHandler,
    BlockElectorHandler,
    RequestAttachmentUploadHandler,
    ConfirmAttachmentUploadHandler,
    GetVoteHandler,
    GetVotePageHandler,
    GetVoteDetailHandler,
    GetVoteDetailPageHandler,
    GetCandidateHandler,
    GetCandidatePageHandler,
    GetElectionCommissionHandler,
    GetElectionCommissionPageHandler,
    GetElectoralRollHandler,
    GetFieldVotingSessionHandler,
    GetFieldVotingSessionPageHandler,
    GetElectorHandler,
    GetElectorPageHandler,
    GetVoteTurnoutHandler,
    GetVoteResultHandler,
    {
      provide: DATABASE_HEALTH_PORT,
      useClass: NotConfiguredDatabaseHealthAdapter,
    },
    {
      provide: ELECTOR_IDENTITY_VERIFICATION_PORT,
      useClass: NotConfiguredElectorIdentityVerificationAdapter,
    },
  ],
})
export class AppModule {}
