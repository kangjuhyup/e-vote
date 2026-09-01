import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AttachmentTargetValidator } from './modules/vote/application/command/attachment-target.validator';
import { ConfirmAttachmentUploadHandler } from './modules/vote/application/command/handler/confirm-attachment-upload.handler';
import { AddElectoralRollMembersHandler } from './modules/electoral-roll/application/command/handler/add-electoral-roll-members.handler';
import { AttachElectoralRollSnapshotHandler } from './modules/vote/application/command/handler/attach-electoral-roll-snapshot.handler';
import { AuthenticateElectorHandler } from './modules/elector/application/command/handler/authenticate-elector.handler';
import { BlockElectorHandler } from './modules/elector/application/command/handler/block-elector.handler';
import { CancelFieldVotingSessionHandler } from './modules/field-voting/application/command/handler/cancel-field-voting-session.handler';
import { ChangeVoteDetailStatusHandler } from './modules/vote/application/command/handler/change-vote-detail-status.handler';
import { ChangeVoteStatusHandler } from './modules/vote/application/command/handler/change-vote-status.handler';
import { CloseFieldVotingSessionHandler } from './modules/field-voting/application/command/handler/close-field-voting-session.handler';
import { CreateCandidateHandler } from './modules/vote/application/command/handler/create-candidate.handler';
import { CreateElectionCommissionHandler } from './modules/election-commission/application/command/handler/create-election-commission.handler';
import { CreateElectoralRollHandler } from './modules/electoral-roll/application/command/handler/create-electoral-roll.handler';
import { ElectoralRollSnapshotCreator } from './modules/electoral-roll/application/command/electoral-roll-snapshot.creator';
import { CreateElectorHandler } from './modules/elector/application/command/handler/create-elector.handler';
import { CreateFieldVotingSessionHandler } from './modules/field-voting/application/command/handler/create-field-voting-session.handler';
import { CreateVoteDetailHandler } from './modules/vote/application/command/handler/create-vote-detail.handler';
import { CreateVoteHandler } from './modules/vote/application/command/handler/create-vote.handler';
import { OpenFieldVotingSessionHandler } from './modules/field-voting/application/command/handler/open-field-voting-session.handler';
import { RecordFieldParticipationEvidenceHandler } from './modules/field-voting/application/command/handler/record-field-participation-evidence.handler';
import { SendFieldVotingSessionSmsHandler } from './modules/field-voting/application/command/handler/send-field-voting-session-sms.handler';
import { RegisterElectionCommissionMemberHandler } from './modules/election-commission/application/command/handler/register-election-commission-member.handler';
import { RemoveElectoralRollMemberHandler } from './modules/electoral-roll/application/command/handler/remove-electoral-roll-member.handler';
import { RequestAttachmentUploadHandler } from './modules/vote/application/command/handler/request-attachment-upload.handler';
import { SendVoteSmsHandler } from './modules/vote/application/command/handler/send-vote-sms.handler';
import { UpdateCandidateHandler } from './modules/vote/application/command/handler/update-candidate.handler';
import { UpdateElectoralRollMemberHandler } from './modules/electoral-roll/application/command/handler/update-electoral-roll-member.handler';
import { UpdateElectorHandler } from './modules/elector/application/command/handler/update-elector.handler';
import { UpdateVoteDetailHandler } from './modules/vote/application/command/handler/update-vote-detail.handler';
import { UpdateVoteHandler } from './modules/vote/application/command/handler/update-vote.handler';
import { WithdrawCandidateHandler } from './modules/vote/application/command/handler/withdraw-candidate.handler';
import { ELECTOR_IDENTITY_VERIFICATION_PORT } from './modules/elector/application/port/gateway/elector-identity-verification.port';
import { GetCandidatePageHandler } from './modules/vote/application/query/handler/get-candidate-page.handler';
import { GetCandidateHandler } from './modules/vote/application/query/handler/get-candidate.handler';
import { GetElectionCommissionHandler } from './modules/election-commission/application/query/handler/get-election-commission.handler';
import { GetElectionCommissionPageHandler } from './modules/election-commission/application/query/handler/get-election-commission-page.handler';
import { GetElectoralRollHandler } from './modules/electoral-roll/application/query/handler/get-electoral-roll.handler';
import { GetElectoralRollPageHandler } from './modules/electoral-roll/application/query/handler/get-electoral-roll-page.handler';
import { GetFieldVotingSessionHandler } from './modules/field-voting/application/query/handler/get-field-voting-session.handler';
import { GetFieldVotingSessionPageHandler } from './modules/field-voting/application/query/handler/get-field-voting-session-page.handler';
import { GetElectorPageHandler } from './modules/elector/application/query/handler/get-elector-page.handler';
import { GetElectorHandler } from './modules/elector/application/query/handler/get-elector.handler';
import { GetVoteDetailPageHandler } from './modules/vote/application/query/handler/get-vote-detail-page.handler';
import { GetVoteDetailHandler } from './modules/vote/application/query/handler/get-vote-detail.handler';
import { GetVotePageHandler } from './modules/vote/application/query/handler/get-vote-page.handler';
import { GetVoteHandler } from './modules/vote/application/query/handler/get-vote.handler';
import { GetSmsDispatchPageHandler } from './modules/vote/application/query/handler/get-sms-dispatch-page.handler';
import { GetSmsDispatchHandler } from './modules/vote/application/query/handler/get-sms-dispatch.handler';
import { GetVoteResultHandler } from './modules/participation/application/query/handler/get-vote-result.handler';
import { GetVoteTurnoutHandler } from './modules/participation/application/query/handler/get-vote-turnout.handler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlatformModule } from './platform/platform.module';
import { createDatabaseEntityRegistry } from './composition/database-entity.registry';
import {
  databaseRepositoryPortTokens,
  databaseRepositoryProviders,
} from './composition/database-repository.providers';
import { NotConfiguredElectorIdentityVerificationAdapter } from './modules/elector/infrastructure/security/not-configured-elector-identity-verification.adapter';
import { RandomSmsSenderAdapter } from './shared/infrastructure/sms/random-sms-sender.adapter';
import { ElectorSmsRecipientAccessAdapter } from './modules/elector/infrastructure/sms/elector-sms-recipient-access.adapter';
import { CandidateAttachmentController } from './modules/vote/presentation/candidate/candidate-attachment.controller';
import { CandidateReadController } from './modules/vote/presentation/candidate/candidate-read.controller';
import { CandidateController } from './modules/vote/presentation/candidate/candidate.controller';
import { ElectionCommissionReadController } from './modules/election-commission/presentation/election-commission/election-commission-read.controller';
import { ElectionCommissionController } from './modules/election-commission/presentation/election-commission/election-commission.controller';
import { ElectoralRollController } from './modules/electoral-roll/presentation/electoral-roll/electoral-roll.controller';
import { ElectoralRollReadController } from './modules/electoral-roll/presentation/electoral-roll/electoral-roll-read.controller';
import { ElectorController } from './modules/elector/presentation/elector/elector.controller';
import { FieldVotingSessionReadController } from './modules/field-voting/presentation/field-voting-session/field-voting-session-read.controller';
import { FieldVotingSessionController } from './modules/field-voting/presentation/field-voting-session/field-voting-session.controller';
import { FieldVotingSessionSmsController } from './modules/field-voting/presentation/field-voting-session-sms/field-voting-session-sms.controller';
import { ElectorReadController } from './modules/elector/presentation/elector/elector-read.controller';
import { VoteDetailAttachmentController } from './modules/vote/presentation/vote-detail/vote-detail-attachment.controller';
import { VoteDetailReadController } from './modules/vote/presentation/vote-detail/vote-detail-read.controller';
import { VoteDetailController } from './modules/vote/presentation/vote-detail/vote-detail.controller';
import { VoteAttachmentController } from './modules/vote/presentation/vote/vote-attachment.controller';
import { VoteReadController } from './modules/vote/presentation/vote/vote-read.controller';
import { VoteController } from './modules/vote/presentation/vote/vote.controller';
import { VoteSmsController } from './modules/vote/presentation/vote-sms/vote-sms.controller';
import { VoteSmsReadController } from './modules/vote/presentation/vote-sms/vote-sms-read.controller';
import { VoteStatisticsController } from './modules/participation/presentation/vote-statistics/vote-statistics.controller';
import { FieldParticipationEvidenceController } from './modules/field-voting/presentation/participation/field-participation-evidence.controller';
import {
  ELECTION_COMMISSION_ACCESS_PORT,
  ELECTION_COMMISSION_MEMBER_ACCESS_PORT,
} from './shared/application/port/capability/election-commission-access.port';
import {
  CANDIDATE_ACCESS_PORT,
  VOTE_ACCESS_PORT,
  VOTE_DETAIL_ACCESS_PORT,
} from './shared/application/port/capability/vote-access.port';
import { ELECTOR_ACCESS_PORT } from './shared/application/port/capability/elector-access.port';
import { FIELD_VOTING_SESSION_ACCESS_PORT } from './shared/application/port/capability/field-voting-access.port';
import { PARTICIPATION_ACCESS_PORT } from './shared/application/port/capability/participation-access.port';
import { FILE_ACCESS_PORT } from './shared/application/port/capability/file-access.port';
import { ELECTORAL_ROLL_SNAPSHOT_ACCESS_PORT } from './shared/application/port/capability/electoral-roll-snapshot-access.port';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from './modules/election-commission/application/port/persistence/command/election-commission-repository.port';
import { ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT } from './modules/election-commission/application/port/persistence/command/election-commission-member-repository.port';
import { VOTE_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/vote-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/vote-detail-repository.port';
import { CANDIDATE_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/candidate-repository.port';
import { ELECTOR_REPOSITORY_PORT } from './modules/elector/application/port/persistence/command/elector-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from './modules/field-voting/application/port/persistence/command/field-voting-session-repository.port';
import { PARTICIPATION_REPOSITORY_PORT } from './modules/participation/application/port/persistence/command/participation-repository.port';
import { FILE_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/file-repository.port';
import { ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT } from './modules/electoral-roll/application/port/persistence/command/electoral-roll-snapshot-repository.port';
import { AuthenticatedUserGuard } from './shared/presentation/common/guard/authenticated-user.guard';
import { SMS_SENDER_PORT } from './shared/application/port/gateway/sms-sender.port';
import { SMS_RECIPIENT_ACCESS_PORT } from './shared/application/port/capability/sms-recipient-access.port';
import { BillingOrderController } from './modules/billing/presentation/billing-order/billing-order.controller';
import { CreateVoteUsageBillingOrderHandler } from './modules/billing/application/command/handler/create-vote-usage-billing-order.handler';
import { MarkBillingOrderPaidHandler } from './modules/billing/application/command/handler/mark-billing-order-paid.handler';
import { GetBillingOrderHandler } from './modules/billing/application/query/handler/get-billing-order.handler';
import { BillingOrderCancellationController } from './modules/billing/presentation/billing-order/billing-order-cancellation.controller';
import { CancelVoteUsageBillingOrderHandler } from './modules/billing/application/command/handler/cancel-vote-usage-billing-order.handler';
import { BILLING_ORDER_REPOSITORY_PORT } from './modules/billing/application/port/persistence/command/billing-order-repository.port';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  VOTE_USAGE_ENTITLEMENT_ACCESS_PORT,
} from './shared/application/port/capability/vote-billing.port';

@Module({
  imports: [
    PlatformModule.register({
      entityRegistryFactory: createDatabaseEntityRegistry,
      repositoryProviders: databaseRepositoryProviders,
      repositoryPortTokens: databaseRepositoryPortTokens,
    }),
  ],
  controllers: [
    AppController,
    VoteController,
    VoteSmsController,
    VoteSmsReadController,
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
    FieldVotingSessionSmsController,
    ElectorReadController,
    VoteStatisticsController,
    FieldParticipationEvidenceController,
    BillingOrderController,
    BillingOrderCancellationController,
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthenticatedUserGuard,
    },
    {
      provide: ELECTION_COMMISSION_ACCESS_PORT,
      useExisting: ELECTION_COMMISSION_REPOSITORY_PORT,
    },
    {
      provide: ELECTION_COMMISSION_MEMBER_ACCESS_PORT,
      useExisting: ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT,
    },
    { provide: VOTE_ACCESS_PORT, useExisting: VOTE_REPOSITORY_PORT },
    { provide: VOTE_SETUP_LIFECYCLE_PORT, useExisting: VOTE_REPOSITORY_PORT },
    {
      provide: VOTE_USAGE_ENTITLEMENT_ACCESS_PORT,
      useExisting: BILLING_ORDER_REPOSITORY_PORT,
    },
    {
      provide: VOTE_DETAIL_ACCESS_PORT,
      useExisting: VOTE_DETAIL_REPOSITORY_PORT,
    },
    { provide: CANDIDATE_ACCESS_PORT, useExisting: CANDIDATE_REPOSITORY_PORT },
    { provide: ELECTOR_ACCESS_PORT, useExisting: ELECTOR_REPOSITORY_PORT },
    {
      provide: FIELD_VOTING_SESSION_ACCESS_PORT,
      useExisting: FIELD_VOTING_SESSION_REPOSITORY_PORT,
    },
    {
      provide: PARTICIPATION_ACCESS_PORT,
      useExisting: PARTICIPATION_REPOSITORY_PORT,
    },
    { provide: FILE_ACCESS_PORT, useExisting: FILE_REPOSITORY_PORT },
    {
      provide: ELECTORAL_ROLL_SNAPSHOT_ACCESS_PORT,
      useExisting: ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
    },
    AttachmentTargetValidator,
    CreateVoteHandler,
    CreateVoteDetailHandler,
    CreateCandidateHandler,
    CreateElectionCommissionHandler,
    RegisterElectionCommissionMemberHandler,
    CreateElectoralRollHandler,
    AddElectoralRollMembersHandler,
    UpdateElectoralRollMemberHandler,
    RemoveElectoralRollMemberHandler,
    ElectoralRollSnapshotCreator,
    AttachElectoralRollSnapshotHandler,
    CreateElectorHandler,
    AuthenticateElectorHandler,
    CreateFieldVotingSessionHandler,
    OpenFieldVotingSessionHandler,
    CloseFieldVotingSessionHandler,
    CancelFieldVotingSessionHandler,
    RecordFieldParticipationEvidenceHandler,
    SendFieldVotingSessionSmsHandler,
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
    SendVoteSmsHandler,
    GetVoteHandler,
    GetSmsDispatchPageHandler,
    GetSmsDispatchHandler,
    GetVotePageHandler,
    GetVoteDetailHandler,
    GetVoteDetailPageHandler,
    GetCandidateHandler,
    GetCandidatePageHandler,
    GetElectionCommissionHandler,
    GetElectionCommissionPageHandler,
    GetElectoralRollHandler,
    GetElectoralRollPageHandler,
    GetFieldVotingSessionHandler,
    GetFieldVotingSessionPageHandler,
    GetElectorHandler,
    GetElectorPageHandler,
    GetVoteTurnoutHandler,
    GetVoteResultHandler,
    CreateVoteUsageBillingOrderHandler,
    CancelVoteUsageBillingOrderHandler,
    MarkBillingOrderPaidHandler,
    GetBillingOrderHandler,
    {
      provide: ELECTOR_IDENTITY_VERIFICATION_PORT,
      useClass: NotConfiguredElectorIdentityVerificationAdapter,
    },
    {
      provide: SMS_SENDER_PORT,
      useClass: RandomSmsSenderAdapter,
    },
    {
      provide: SMS_RECIPIENT_ACCESS_PORT,
      useClass: ElectorSmsRecipientAccessAdapter,
    },
  ],
})
export class AppModule {}
