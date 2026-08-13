import type { Provider } from '@nestjs/common';
import { CANDIDATE_REPOSITORY_PORT } from '../../application/port/candidate-repository.port';
import { ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT } from '../../application/port/election-commission-member-repository.port';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from '../../application/port/election-commission-repository.port';
import { ELECTOR_REPOSITORY_PORT } from '../../application/port/elector-repository.port';
import { FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT } from '../../application/port/field-participation-evidence-repository.port';
import { FIELD_VOTING_SESSION_REPOSITORY_PORT } from '../../application/port/field-voting-session-repository.port';
import { FILE_REPOSITORY_PORT } from '../../application/port/file-repository.port';
import { PARTICIPATION_REPOSITORY_PORT } from '../../application/port/participation-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from '../../application/port/vote-detail-repository.port';
import { VOTE_READ_REPOSITORY_PORT } from '../../application/port/vote-read-repository.port';
import { VOTE_REPOSITORY_PORT } from '../../application/port/vote-repository.port';
import { CandidateRepositoryAdapter } from './repository/candidate-repository.adapter';
import { ElectionCommissionMemberRepositoryAdapter } from './repository/election-commission-member-repository.adapter';
import { ElectionCommissionRepositoryAdapter } from './repository/election-commission-repository.adapter';
import { ElectorRepositoryAdapter } from './repository/elector-repository.adapter';
import { FieldParticipationEvidenceRepositoryAdapter } from './repository/field-participation-evidence-repository.adapter';
import { FieldVotingSessionRepositoryAdapter } from './repository/field-voting-session-repository.adapter';
import { FileRepositoryAdapter } from './repository/file-repository.adapter';
import { ParticipationRepositoryAdapter } from './repository/participation-repository.adapter';
import { VoteDetailRepositoryAdapter } from './repository/vote-detail-repository.adapter';
import { VoteReadRepositoryAdapter } from './repository/vote-read-repository.adapter';
import { VoteRepositoryAdapter } from './repository/vote-repository.adapter';

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
    provide: VOTE_REPOSITORY_PORT,
    useClass: VoteRepositoryAdapter,
  },
  {
    provide: VOTE_DETAIL_REPOSITORY_PORT,
    useClass: VoteDetailRepositoryAdapter,
  },
  {
    provide: VOTE_READ_REPOSITORY_PORT,
    useClass: VoteReadRepositoryAdapter,
  },
  {
    provide: ELECTOR_REPOSITORY_PORT,
    useClass: ElectorRepositoryAdapter,
  },
  {
    provide: CANDIDATE_REPOSITORY_PORT,
    useClass: CandidateRepositoryAdapter,
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
    provide: FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT,
    useClass: FieldParticipationEvidenceRepositoryAdapter,
  },
  {
    provide: FILE_REPOSITORY_PORT,
    useClass: FileRepositoryAdapter,
  },
];

export const databaseRepositoryPortTokens = [
  ELECTION_COMMISSION_REPOSITORY_PORT,
  ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT,
  VOTE_REPOSITORY_PORT,
  VOTE_DETAIL_REPOSITORY_PORT,
  VOTE_READ_REPOSITORY_PORT,
  ELECTOR_REPOSITORY_PORT,
  CANDIDATE_REPOSITORY_PORT,
  PARTICIPATION_REPOSITORY_PORT,
  FIELD_VOTING_SESSION_REPOSITORY_PORT,
  FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT,
  FILE_REPOSITORY_PORT,
] as const;
