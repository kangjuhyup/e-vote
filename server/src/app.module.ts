import { DeleteElectoralRollHandler } from './modules/electoral-roll/application/command/handler/delete-electoral-roll.handler';
import { DeleteElectionCommissionHandler } from './modules/election-commission/application/command/handler/delete-election-commission.handler';
import { RemoveElectionCommissionMemberHandler } from './modules/election-commission/application/command/handler/remove-election-commission-member.handler';
import { UpdateElectionCommissionMemberHandler } from './modules/election-commission/application/command/handler/update-election-commission-member.handler';
import { ElectionCommissionManagementAccess } from './modules/election-commission/application/command/election-commission-management.access';
import { ElectoralRollDeletionController } from './modules/electoral-roll/presentation/electoral-roll/electoral-roll-deletion.controller';
import { ElectionCommissionManagementController } from './modules/election-commission/presentation/election-commission/election-commission-management.controller';
import { Module } from '@nestjs/common';
import { AdminOperationsController } from './modules/organization/presentation/organization-onboarding/admin-operations.controller';
import { VoteContentChangeController } from './modules/vote/presentation/vote/vote-content-change.controller';
import { VoteContentChangeWorkflow } from './modules/vote/application/command/vote-content-change.workflow';
import { VoteContentChangeRepositoryAdapter } from './modules/vote/infrastructure/database/repository/command/vote-content-change-repository.adapter';
import { VOTE_CONTENT_CHANGE_REPOSITORY_PORT } from './modules/vote/application/port/persistence/command/vote-content-change-repository.port';
import { GetAdminOperationsHandler } from './modules/organization/application/query/handler/get-admin-operations.handler';
import { AdminOperationsReadRepositoryAdapter } from './modules/organization/infrastructure/database/repository/admin-operations-read-repository.adapter';
import { ADMIN_OPERATIONS_READ_REPOSITORY_PORT } from './modules/organization/application/port/persistence/admin-operations-read-repository.port';
import { BillingPaymentFailureController } from './modules/billing/presentation/billing-order/billing-payment-failure.controller';
import { RecordBillingPaymentFailureHandler } from './modules/billing/application/command/handler/record-billing-payment-failure.handler';
import { BillingPaymentFailureRepositoryAdapter } from './modules/billing/infrastructure/database/repository/command/billing-payment-failure-repository.adapter';
import { BILLING_PAYMENT_FAILURE_REPOSITORY_PORT } from './modules/billing/application/port/persistence/command/billing-payment-failure-repository.port';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AttachmentTargetValidator } from './modules/vote/application/command/attachment-target.validator';
import { ConfirmAttachmentUploadHandler } from './modules/vote/application/command/handler/confirm-attachment-upload.handler';
import { DeleteAttachmentHandler } from './modules/vote/application/command/handler/delete-attachment.handler';
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
import { ElectoralRollSnapshotResolver } from './modules/electoral-roll/application/command/electoral-roll-snapshot.resolver';
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
import { GetAttachmentDownloadUrlHandler } from './modules/vote/application/query/handler/get-attachment-download-url.handler';
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
import { GetParticipationReminderTemplateHandler } from './modules/vote/application/query/handler/get-participation-reminder-template.handler';
import { GetVoteNoticeTemplateHandler } from './modules/vote/application/query/handler/get-vote-notice-template.handler';
import { GetVoteResultHandler } from './modules/participation/application/query/handler/get-vote-result.handler';
import { GetVoteTurnoutHandler } from './modules/participation/application/query/handler/get-vote-turnout.handler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlatformModule } from './platform/platform.module';
import { createDatabaseEntityRegistry } from './composition/persistence/database-entity.registry';
import {
  databaseRepositoryPortTokens,
  databaseRepositoryProviders,
} from './composition/persistence/database-repository.providers';
import { createElectorIdentityVerificationAdapter } from './modules/elector/infrastructure/security/elector-identity-verification.config';
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
import { VoteOrganizationAccessGuard } from './modules/vote/presentation/vote/vote-organization-access.guard';
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
import { AuthenticatedUserGuard } from './shared/presentation/common/guard/authenticated-user.guard';
import { SMS_SENDER_PORT } from './shared/application/port/gateway/sms-sender.port';
import { SMS_RECIPIENT_ACCESS_PORT } from './shared/application/port/capability/sms-recipient-access.port';
import { BillingOrderController } from './modules/billing/presentation/billing-order/billing-order.controller';
import { TossTestPaymentController } from './modules/billing/presentation/billing-order/toss-test-payment.controller';
import { TossTestWebhookController } from './modules/billing/presentation/billing-order/toss-test-webhook.controller';
import { ConfirmTossTestPaymentHandler } from './modules/billing/application/command/handler/confirm-toss-test-payment.handler';
import { ProcessTossTestWebhookHandler } from './modules/billing/application/command/handler/process-toss-test-webhook.handler';
import { MarkBillingOrderPaidHandler } from './modules/billing/application/command/handler/mark-billing-order-paid.handler';
import { MarkBillingOrderRefundedHandler } from './modules/billing/application/command/handler/mark-billing-order-refunded.handler';
import { PAYMENT_GATEWAY_PORT } from './modules/billing/application/port/gateway/payment-gateway.port';
import { TOSS_TEST_PAYMENT_ENABLED } from './modules/billing/application/port/gateway/toss-test-payment-availability.port';
import { createTossTestPaymentGateway } from './modules/billing/infrastructure/payment/toss-test-payment-gateway.adapter';
import { CreateVoteUsageBillingOrderHandler } from './modules/billing/application/command/handler/create-vote-usage-billing-order.handler';
import { GetBillingOrderHandler } from './modules/billing/application/query/handler/get-billing-order.handler';
import { BillingOrderCancellationController } from './modules/billing/presentation/billing-order/billing-order-cancellation.controller';
import { CancelVoteUsageBillingOrderHandler } from './modules/billing/application/command/handler/cancel-vote-usage-billing-order.handler';
import { BILLING_ORDER_REPOSITORY_PORT } from './modules/billing/application/port/persistence/command/billing-order-repository.port';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  VOTE_USAGE_ENTITLEMENT_ACCESS_PORT,
} from './shared/application/port/capability/vote-billing.port';
import { BillingOrderOutboxRecorder } from './modules/billing/application/event/billing-order-outbox.recorder';
import { ParticipationController } from './modules/participation/presentation/participation/participation.controller';
import { CastParticipationHandler } from './modules/participation/application/command/handler/cast-participation.handler';
import { ElectorSignatureController } from './modules/elector/presentation/elector/elector-signature.controller';
import { RequestElectorSignatureUploadHandler } from './modules/elector/application/command/handler/request-elector-signature-upload.handler';
import { ConfirmElectorSignatureUploadHandler } from './modules/elector/application/command/handler/confirm-elector-signature-upload.handler';
import {
  ParticipationAccessController,
  PARTICIPATION_ALLOWED_ORIGINS,
} from './modules/participation/presentation/participation-access/participation-access.controller';
import { ParticipationInvitationController } from './modules/participation/presentation/participation-invitation/participation-invitation.controller';
import { DispatchParticipationInvitationsHandler } from './modules/participation/application/command/handler/dispatch-participation-invitations.handler';
import { IssueParticipationReminderLinksHandler } from './modules/participation/application/command/handler/issue-participation-reminder-links.handler';
import { ExchangeParticipationAccessHandler } from './modules/participation/application/command/handler/exchange-participation-access.handler';
import { ResolveParticipationAccessSessionHandler } from './modules/participation/application/query/handler/resolve-participation-access-session.handler';
import { ParticipantSignatureUploadHandler } from './modules/participation/application/command/handler/participant-signature-upload.handler';
import { CastParticipationWithAccessHandler } from './modules/participation/application/command/handler/cast-participation-with-access.handler';
import { GetParticipationResultWithAccessHandler } from './modules/participation/application/query/handler/get-participation-result-with-access.handler';
import { GetParticipationAccessHandler } from './modules/participation/application/query/handler/get-participation-access.handler';
import { RevokeParticipationAccessSessionHandler } from './modules/participation/application/command/handler/revoke-participation-access-session.handler';
import { PARTICIPATION_INVITATION_RECIPIENT_ACCESS_PORT } from './modules/participation/application/port/capability/participation-invitation-recipient-access.port';
import { ParticipationInvitationRecipientAccessAdapter } from './modules/participation/infrastructure/database/repository/query/participation-invitation-recipient-access.adapter';
import {
  AUTHORIZED_PARTICIPATION_CAST_PORT,
  ELECTOR_SIGNATURE_OPERATION_PORT,
  type AuthorizedParticipationCastPort,
  type ElectorSignatureOperationPort,
} from './shared/application/port/capability/participant-operations.port';
import { PARTICIPATION_ACCESS_TOKEN_PORT } from './modules/participation/application/port/security/participation-access-token.port';
import {
  createParticipationAccessTokenAdapter,
  resolveParticipationAllowedOrigins,
  resolveParticipationUiUrl,
  type ParticipationAccessEnvironment,
} from './modules/participation/infrastructure/security/participation-access-token.config';
import { PARTICIPATION_ACCESS_RATE_LIMIT_PORT } from './modules/participation/application/port/security/participation-access-rate-limit.port';
import { RedisParticipationAccessRateLimitAdapter } from './modules/participation/infrastructure/security/redis-participation-access-rate-limit.adapter';
import { DevelopmentParticipationLinkController } from './modules/participation/presentation/development-participation-link/development-participation-link.controller';
import { DevelopmentParticipationDispatchLinkController } from './modules/participation/presentation/development-participation-link/development-participation-dispatch-link.controller';
import { isDevelopmentParticipationLinkEnabled } from './modules/participation/presentation/development-participation-link/development-participation-link.config';
import { GetDevelopmentParticipationLinkHandler } from './modules/participation/application/query/handler/get-development-participation-link.handler';
import { GetDevelopmentParticipationDispatchLinkHandler } from './modules/participation/application/query/handler/get-development-participation-dispatch-link.handler';
import { DevelopmentParticipationLinkReadAdapter } from './modules/participation/infrastructure/database/repository/query/development-participation-link-read.adapter';
import { DEVELOPMENT_PARTICIPATION_LINK_READ_PORT } from './modules/participation/application/port/persistence/query/development-participation-link-read.port';
import { PARTICIPATION_UI_URL } from './modules/participation/application/port/gateway/participation-invitation-sms-sender.port';
import { PARTICIPATION_REMINDER_LINK_ISSUER_PORT } from './shared/application/port/capability/participation-reminder-link-issuer.port';
import { OrganizationOnboardingController } from './modules/organization/presentation/organization-onboarding/organization-onboarding.controller';
import { OrganizationOnboardingService } from './modules/organization/application/organization-onboarding.service';
import { OrganizationMembershipService } from './modules/organization/application/organization-membership.service';
import { OrganizationMembershipController } from './modules/organization/presentation/organization-membership/organization-membership.controller';
import { AUTH_ORGANIZATION_PROVISIONING_PORT } from './modules/organization/application/port/gateway/auth-organization-provisioning.port';
import { AuthAdminOrganizationProvisioningAdapter } from './modules/organization/infrastructure/auth/auth-admin-organization-provisioning.adapter';
import { UserProfileController } from './modules/user-profile/presentation/user-profile.controller';
import { UserProfileService } from './modules/user-profile/application/user-profile.service';
import { VoteRegistrationController } from './modules/user-profile/presentation/vote-registration.controller';
import { VoteRegistrationService } from './modules/user-profile/application/vote-registration.service';
import { AUTH_ACCOUNT_REGISTRATION_PORT } from './modules/user-profile/application/port/auth-account-registration.port';
import { AuthAdminAccountRegistrationAdapter } from './modules/user-profile/infrastructure/auth/auth-admin-account-registration.adapter';

const developmentParticipationLinkEnabled =
  isDevelopmentParticipationLinkEnabled(process.env.NODE_ENV);

@Module({
  imports: [
    PlatformModule.register({
      entityRegistryFactory: createDatabaseEntityRegistry,
      repositoryProviders: databaseRepositoryProviders,
      repositoryPortTokens: databaseRepositoryPortTokens,
    }),
  ],
  controllers: [
    ElectoralRollDeletionController,
    ElectionCommissionManagementController,
    AppController,
    VoteController,
    VoteContentChangeController,
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
    ElectorSignatureController,
    ParticipationController,
    VoteStatisticsController,
    FieldParticipationEvidenceController,
    BillingOrderController,
    TossTestPaymentController,
    TossTestWebhookController,
    BillingOrderCancellationController,
    ParticipationAccessController,
    ParticipationInvitationController,
    OrganizationOnboardingController,
    AdminOperationsController,
    BillingPaymentFailureController,
    OrganizationMembershipController,
    UserProfileController,
    VoteRegistrationController,
    ...(developmentParticipationLinkEnabled
      ? [
          DevelopmentParticipationLinkController,
          DevelopmentParticipationDispatchLinkController,
        ]
      : []),
  ],
  providers: [
    UserProfileService,
    VoteRegistrationService,
    DeleteElectoralRollHandler,
    DeleteElectionCommissionHandler,
    RemoveElectionCommissionMemberHandler,
    UpdateElectionCommissionMemberHandler,
    ElectionCommissionManagementAccess,
    AppService,
    OrganizationOnboardingService,
    GetAdminOperationsHandler,
    AdminOperationsReadRepositoryAdapter,
    RecordBillingPaymentFailureHandler,
    BillingPaymentFailureRepositoryAdapter,
    {
      provide: BILLING_PAYMENT_FAILURE_REPOSITORY_PORT,
      useExisting: BillingPaymentFailureRepositoryAdapter,
    },
    {
      provide: ADMIN_OPERATIONS_READ_REPOSITORY_PORT,
      useExisting: AdminOperationsReadRepositoryAdapter,
    },
    OrganizationMembershipService,
    {
      provide: AUTH_ORGANIZATION_PROVISIONING_PORT,
      useClass: AuthAdminOrganizationProvisioningAdapter,
    },
    {
      provide: AUTH_ACCOUNT_REGISTRATION_PORT,
      useClass: AuthAdminAccountRegistrationAdapter,
    },
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
      useExisting: ElectoralRollSnapshotResolver,
    },
    AttachmentTargetValidator,
    VoteContentChangeWorkflow,
    VoteContentChangeRepositoryAdapter,
    {
      provide: VOTE_CONTENT_CHANGE_REPOSITORY_PORT,
      useExisting: VoteContentChangeRepositoryAdapter,
    },
    CreateVoteHandler,
    {
      provide: APP_GUARD,
      useClass: VoteOrganizationAccessGuard,
    },
    CreateVoteDetailHandler,
    CreateCandidateHandler,
    CreateElectionCommissionHandler,
    RegisterElectionCommissionMemberHandler,
    CreateElectoralRollHandler,
    AddElectoralRollMembersHandler,
    UpdateElectoralRollMemberHandler,
    RemoveElectoralRollMemberHandler,
    ElectoralRollSnapshotCreator,
    ElectoralRollSnapshotResolver,
    AttachElectoralRollSnapshotHandler,
    CreateElectorHandler,
    AuthenticateElectorHandler,
    RequestElectorSignatureUploadHandler,
    ConfirmElectorSignatureUploadHandler,
    CastParticipationHandler,
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
    DeleteAttachmentHandler,
    GetAttachmentDownloadUrlHandler,
    SendVoteSmsHandler,
    GetVoteHandler,
    GetSmsDispatchPageHandler,
    GetSmsDispatchHandler,
    GetParticipationReminderTemplateHandler,
    GetVoteNoticeTemplateHandler,
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
    BillingOrderOutboxRecorder,
    MarkBillingOrderPaidHandler,
    MarkBillingOrderRefundedHandler,
    ConfirmTossTestPaymentHandler,
    ProcessTossTestWebhookHandler,
    {
      provide: PAYMENT_GATEWAY_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createTossTestPaymentGateway(
          config.get<string>('BILLING_PAYMENT_MODE'),
          config.get<string>('TOSS_SECRET_KEY'),
          config.get<string>('NODE_ENV'),
        ),
    },
    {
      provide: TOSS_TEST_PAYMENT_ENABLED,
      inject: [ConfigService],
      useFactory: (config: ConfigService): boolean =>
        config.get<string>('BILLING_PAYMENT_MODE') === 'toss-test',
    },
    CreateVoteUsageBillingOrderHandler,
    CancelVoteUsageBillingOrderHandler,
    GetBillingOrderHandler,
    DispatchParticipationInvitationsHandler,
    ExchangeParticipationAccessHandler,
    ResolveParticipationAccessSessionHandler,
    ParticipantSignatureUploadHandler,
    CastParticipationWithAccessHandler,
    GetParticipationResultWithAccessHandler,
    GetParticipationAccessHandler,
    RevokeParticipationAccessSessionHandler,
    IssueParticipationReminderLinksHandler,
    {
      provide: PARTICIPATION_REMINDER_LINK_ISSUER_PORT,
      useExisting: IssueParticipationReminderLinksHandler,
    },
    ...(developmentParticipationLinkEnabled
      ? [
          GetDevelopmentParticipationLinkHandler,
          GetDevelopmentParticipationDispatchLinkHandler,
          DevelopmentParticipationLinkReadAdapter,
          {
            provide: DEVELOPMENT_PARTICIPATION_LINK_READ_PORT,
            useExisting: DevelopmentParticipationLinkReadAdapter,
          },
        ]
      : []),
    RedisParticipationAccessRateLimitAdapter,
    {
      provide: PARTICIPATION_ACCESS_RATE_LIMIT_PORT,
      useExisting: RedisParticipationAccessRateLimitAdapter,
    },
    {
      provide: ELECTOR_SIGNATURE_OPERATION_PORT,
      inject: [
        RequestElectorSignatureUploadHandler,
        ConfirmElectorSignatureUploadHandler,
      ],
      useFactory: (
        request: RequestElectorSignatureUploadHandler,
        confirm: ConfirmElectorSignatureUploadHandler,
      ): ElectorSignatureOperationPort => ({
        requestUpload: (command) => request.executeAuthorized(command),
        confirmUpload: (command, reauthorize) =>
          confirm.executeAuthorized(command, reauthorize),
      }),
    },
    {
      provide: AUTHORIZED_PARTICIPATION_CAST_PORT,
      inject: [CastParticipationHandler],
      useFactory: (
        casting: CastParticipationHandler,
      ): AuthorizedParticipationCastPort => ({
        cast: (command) =>
          casting.executeAuthorized({
            ...command,
            fieldVotingSessionId: command.fieldVotingSessionId,
          }),
      }),
    },
    ParticipationInvitationRecipientAccessAdapter,
    {
      provide: PARTICIPATION_INVITATION_RECIPIENT_ACCESS_PORT,
      useExisting: ParticipationInvitationRecipientAccessAdapter,
    },
    {
      provide: PARTICIPATION_ACCESS_TOKEN_PORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createParticipationAccessTokenAdapter(
          participationAccessEnvironment(config),
        ),
    },
    {
      provide: PARTICIPATION_UI_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        resolveParticipationUiUrl(participationAccessEnvironment(config)),
    },
    {
      provide: PARTICIPATION_ALLOWED_ORIGINS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        resolveParticipationAllowedOrigins(
          participationAccessEnvironment(config),
        ),
    },
    {
      provide: ELECTOR_IDENTITY_VERIFICATION_PORT,
      useFactory: createElectorIdentityVerificationAdapter,
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

function participationAccessEnvironment(
  config: ConfigService,
): ParticipationAccessEnvironment {
  return {
    PARTICIPATION_LINK_SIGNING_KEY: config.get<string>(
      'PARTICIPATION_LINK_SIGNING_KEY',
    ),
    PARTICIPATION_LINK_SIGNING_KEY_ID: config.get<string>(
      'PARTICIPATION_LINK_SIGNING_KEY_ID',
    ),
    PARTICIPATION_LINK_VERIFICATION_KEYS: config.get<string>(
      'PARTICIPATION_LINK_VERIFICATION_KEYS',
    ),
    PARTICIPATION_UI_URL: config.get<string>('PARTICIPATION_UI_URL'),
    PARTICIPATION_ALLOWED_ORIGINS: config.get<string>(
      'PARTICIPATION_ALLOWED_ORIGINS',
    ),
  };
}
