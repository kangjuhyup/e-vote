export type ParticipationAccessState =
  | 'DRAFT'
  | 'FINALIZED'
  | 'OPEN'
  | 'CLOSED'
  | 'CANCELED';

export interface ParticipationCandidate {
  candidateNo: number;
  description: string;
  id: string;
  name: string;
}

export interface ParticipationBallot {
  candidates: ParticipationCandidate[];
  description: string;
  id: string;
  participated: boolean;
  sortOrder: number;
  status: ParticipationAccessState;
  title: string;
  type: 'CANDIDATE' | 'YES_NO';
}

export interface ParticipationAccess {
  ballots: ParticipationBallot[];
  elector: {
    identityVerified: boolean;
    label: string;
  };
  vote: {
    description: string;
    endedAt: string;
    id: string;
    identityVerificationRequired: boolean;
    startedAt: string;
    status: ParticipationAccessState;
    title: string;
    votingChannels: Array<'ONLINE' | 'ONSITE' | 'VISIT'>;
  };
}

export interface GetParticipationAccessInput {
  electorId: string;
  electorLabel: string;
  voteId: string;
}

export interface AuthenticateParticipantInput {
  electorId: string;
  voteId: string;
}

export interface AuthenticateParticipantResult {
  electorId: string;
  identityVerified: boolean;
  voteId: string;
}

export interface CastParticipationInput {
  electorId: string;
  selectedCandidateId: string;
  voteDetailId: string;
  voteId: string;
}

export interface CastParticipationResult {
  id: string;
  status: 'CAST';
  voteDetailId: string;
}
