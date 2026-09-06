export type ParticipationAccessState = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELED';

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
    status: 'ELIGIBLE' | 'BLOCKED';
  };
  expiresAt: string;
  vote: {
    description: string;
    endedAt: string;
    id: string;
    identityVerificationRequired: boolean;
    startedAt: string;
    status: ParticipationAccessState;
    title: string;
  };
}

export interface CastParticipationInput {
  selectedCandidateId: string;
  token: string;
  voteDetailId: string;
}
