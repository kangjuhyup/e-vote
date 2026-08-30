import type { Provider } from '@nestjs/common';
import { ATTACHMENT_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/command/attachment-repository.port';
import { CANDIDATE_READ_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/query/candidate-read-repository.port';
import { CANDIDATE_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/command/candidate-repository.port';
import { ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT } from '../modules/election-commission/application/port/persistence/command/election-commission-member-repository.port';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from '../modules/election-commission/application/port/persistence/command/election-commission-repository.port';
import { ELECTORAL_ROLL_REPOSITORY_PORT } from '../modules/electoral-roll/application/port/persistence/command/electoral-roll-repository.port';
import { ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT } from '../modules/electoral-roll/application/port/persistence/command/electoral-roll-snapshot-repository.port';
import { ELECTION_COMMISSION_READ_REPOSITORY_PORT } from '../modules/election-commission/application/port/persistence/query/election-commission-read-repository.port';
import { ELECTORAL_ROLL_READ_REPOSITORY_PORT } from '../modules/electoral-roll/application/port/persistence/query/electoral-roll-read-repository.port';
import { ELECTOR_READ_REPOSITORY_PORT } from '../modules/elector/application/port/persistence/query/elector-read-repository.port';
import { ELECTOR_REPOSITORY_PORT } from '../modules/elector/application/port/persistence/command/elector-repository.port';
import { FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT } from '../modules/field-voting/application/port/persistence/command/field-participation-evidence-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../modules/field-voting/application/port/persistence/command/field-voting-session-repository.port';
import { FIELD_VOTING_SESSION_READ_REPOSITORY_PORT } from '../modules/field-voting/application/port/persistence/query/field-voting-session-read-repository.port';
import { FILE_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/command/file-repository.port';
import { PARTICIPATION_REPOSITORY_PORT } from '../modules/participation/application/port/persistence/command/participation-repository.port';
import { VOTE_DETAIL_READ_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/query/vote-detail-read-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/command/vote-detail-repository.port';
import { VOTE_READ_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/query/vote-read-repository.port';
import { VOTE_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/command/vote-repository.port';
import { VOTE_STATISTICS_READ_REPOSITORY_PORT } from '../modules/participation/application/port/persistence/query/vote-statistics-read-repository.port';
import { AttachmentRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/command/attachment-repository.adapter';
import { CandidateReadRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/query/candidate-read-repository.adapter';
import { CandidateRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/command/candidate-repository.adapter';
import { ElectionCommissionMemberRepositoryAdapter } from '../modules/election-commission/infrastructure/database/repository/command/election-commission-member-repository.adapter';
import { ElectionCommissionRepositoryAdapter } from '../modules/election-commission/infrastructure/database/repository/command/election-commission-repository.adapter';
import { ElectoralRollRepositoryAdapter } from '../modules/electoral-roll/infrastructure/database/repository/command/electoral-roll-repository.adapter';
import { ElectoralRollSnapshotRepositoryAdapter } from '../modules/electoral-roll/infrastructure/database/repository/command/electoral-roll-snapshot-repository.adapter';
import { ElectionCommissionReadRepositoryAdapter } from '../modules/election-commission/infrastructure/database/repository/query/election-commission-read-repository.adapter';
import { ElectoralRollReadRepositoryAdapter } from '../modules/electoral-roll/infrastructure/database/repository/query/electoral-roll-read-repository.adapter';
import { ElectorReadRepositoryAdapter } from '../modules/elector/infrastructure/database/repository/query/elector-read-repository.adapter';
import { ElectorRepositoryAdapter } from '../modules/elector/infrastructure/database/repository/command/elector-repository.adapter';
import { FieldParticipationEvidenceRepositoryAdapter } from '../modules/field-voting/infrastructure/database/repository/command/field-participation-evidence-repository.adapter';
import { FieldVotingSessionRepositoryAdapter } from '../modules/field-voting/infrastructure/database/repository/command/field-voting-session-repository.adapter';
import { FieldVotingSessionReadRepositoryAdapter } from '../modules/field-voting/infrastructure/database/repository/query/field-voting-session-read-repository.adapter';
import { FileRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/command/file-repository.adapter';
import { ParticipationRepositoryAdapter } from '../modules/participation/infrastructure/database/repository/command/participation-repository.adapter';
import { VoteDetailReadRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/query/vote-detail-read-repository.adapter';
import { VoteDetailRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/command/vote-detail-repository.adapter';
import { VoteReadRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/query/vote-read-repository.adapter';
import { VoteRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/command/vote-repository.adapter';
import { VoteStatisticsReadRepositoryAdapter } from '../modules/participation/infrastructure/database/repository/query/vote-statistics-read-repository.adapter';
import { SMS_DISPATCH_REPOSITORY_PORT } from '../shared/application/port/persistence/sms-dispatch-repository.port';
import { SmsDispatchRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/command/sms-dispatch-repository.adapter';
import { SMS_DISPATCH_READ_REPOSITORY_PORT } from '../modules/vote/application/port/persistence/query/sms-dispatch-read-repository.port';
import { SmsDispatchReadRepositoryAdapter } from '../modules/vote/infrastructure/database/repository/query/sms-dispatch-read-repository.adapter';
import { BILLING_ORDER_REPOSITORY_PORT } from '../modules/billing/application/port/persistence/command/billing-order-repository.port';
import { BILLING_ORDER_READ_REPOSITORY_PORT } from '../modules/billing/application/port/persistence/query/billing-order-read-repository.port';
import { BillingOrderRepositoryAdapter } from '../modules/billing/infrastructure/database/repository/command/billing-order-repository.adapter';
import { BillingOrderReadRepositoryAdapter } from '../modules/billing/infrastructure/database/repository/query/billing-order-read-repository.adapter';
import { ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT } from '../shared/application/port/capability/election-commission-membership-access.port';
import { ElectionCommissionMembershipAccessAdapter } from '../modules/election-commission/infrastructure/database/repository/query/election-commission-membership-access.adapter';
import { VOTE_ELECTOR_COUNT_ACCESS_PORT } from '../shared/application/port/capability/vote-elector-count-access.port';
import { VoteElectorCountAccessAdapter } from '../modules/elector/infrastructure/database/repository/query/vote-elector-count-access.adapter';

export const databaseRepositoryProviders: Provider[] = [
  {
    provide: ELECTION_COMMISSION_REPOSITORY_PORT,
    useClass: ElectionCommissionRepositoryAdapter,
  },
  {
    provide: ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT,
    useClass: ElectionCommissionMemberRepositoryAdapter,
  },
  {
    provide: ELECTION_COMMISSION_READ_REPOSITORY_PORT,
    useClass: ElectionCommissionReadRepositoryAdapter,
  },
  {
    provide: ELECTORAL_ROLL_REPOSITORY_PORT,
    useClass: ElectoralRollRepositoryAdapter,
  },
  {
    provide: ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
    useClass: ElectoralRollSnapshotRepositoryAdapter,
  },
  {
    provide: ELECTORAL_ROLL_READ_REPOSITORY_PORT,
    useClass: ElectoralRollReadRepositoryAdapter,
  },
  {
    provide: VOTE_REPOSITORY_PORT,
    useClass: VoteRepositoryAdapter,
  },
  {
    provide: VOTE_DETAIL_REPOSITORY_PORT,
    useClass: VoteDetailRepositoryAdapter,
  },
  {
    provide: VOTE_DETAIL_READ_REPOSITORY_PORT,
    useClass: VoteDetailReadRepositoryAdapter,
  },
  {
    provide: VOTE_READ_REPOSITORY_PORT,
    useClass: VoteReadRepositoryAdapter,
  },
  {
    provide: VOTE_STATISTICS_READ_REPOSITORY_PORT,
    useClass: VoteStatisticsReadRepositoryAdapter,
  },
  {
    provide: ELECTOR_REPOSITORY_PORT,
    useClass: ElectorRepositoryAdapter,
  },
  {
    provide: ELECTOR_READ_REPOSITORY_PORT,
    useClass: ElectorReadRepositoryAdapter,
  },
  {
    provide: CANDIDATE_REPOSITORY_PORT,
    useClass: CandidateRepositoryAdapter,
  },
  {
    provide: CANDIDATE_READ_REPOSITORY_PORT,
    useClass: CandidateReadRepositoryAdapter,
  },
  {
    provide: PARTICIPATION_REPOSITORY_PORT,
    useClass: ParticipationRepositoryAdapter,
  },
  {
    provide: FIELD_VOTING_SESSION_REPOSITORY_PORT,
    useClass: FieldVotingSessionRepositoryAdapter,
  },
  {
    provide: FIELD_VOTING_SESSION_READ_REPOSITORY_PORT,
    useClass: FieldVotingSessionReadRepositoryAdapter,
  },
  {
    provide: FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT,
    useClass: FieldParticipationEvidenceRepositoryAdapter,
  },
  {
    provide: FILE_REPOSITORY_PORT,
    useClass: FileRepositoryAdapter,
  },
  {
    provide: ATTACHMENT_REPOSITORY_PORT,
    useClass: AttachmentRepositoryAdapter,
  },
  {
    provide: SMS_DISPATCH_REPOSITORY_PORT,
    useClass: SmsDispatchRepositoryAdapter,
  },
  {
    provide: SMS_DISPATCH_READ_REPOSITORY_PORT,
    useClass: SmsDispatchReadRepositoryAdapter,
  },
  {
    provide: BILLING_ORDER_REPOSITORY_PORT,
    useClass: BillingOrderRepositoryAdapter,
  },
  {
    provide: BILLING_ORDER_READ_REPOSITORY_PORT,
    useClass: BillingOrderReadRepositoryAdapter,
  },
  {
    provide: ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT,
    useClass: ElectionCommissionMembershipAccessAdapter,
  },
  {
    provide: VOTE_ELECTOR_COUNT_ACCESS_PORT,
    useClass: VoteElectorCountAccessAdapter,
  },
];

export const databaseRepositoryPortTokens = [
  ELECTION_COMMISSION_REPOSITORY_PORT,
  ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT,
  ELECTION_COMMISSION_READ_REPOSITORY_PORT,
  ELECTORAL_ROLL_REPOSITORY_PORT,
  ELECTORAL_ROLL_SNAPSHOT_REPOSITORY_PORT,
  ELECTORAL_ROLL_READ_REPOSITORY_PORT,
  VOTE_REPOSITORY_PORT,
  VOTE_DETAIL_REPOSITORY_PORT,
  VOTE_DETAIL_READ_REPOSITORY_PORT,
  VOTE_READ_REPOSITORY_PORT,
  VOTE_STATISTICS_READ_REPOSITORY_PORT,
  ELECTOR_REPOSITORY_PORT,
  ELECTOR_READ_REPOSITORY_PORT,
  CANDIDATE_REPOSITORY_PORT,
  CANDIDATE_READ_REPOSITORY_PORT,
  PARTICIPATION_REPOSITORY_PORT,
  FIELD_VOTING_SESSION_REPOSITORY_PORT,
  FIELD_VOTING_SESSION_READ_REPOSITORY_PORT,
  FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT,
  FILE_REPOSITORY_PORT,
  ATTACHMENT_REPOSITORY_PORT,
  SMS_DISPATCH_REPOSITORY_PORT,
  SMS_DISPATCH_READ_REPOSITORY_PORT,
  BILLING_ORDER_REPOSITORY_PORT,
  BILLING_ORDER_READ_REPOSITORY_PORT,
  ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT,
  VOTE_ELECTOR_COUNT_ACCESS_PORT,
] as const;
