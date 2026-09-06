export type ParticipationAccessScope = 'PARTICIPATE' | 'RESULT_READ';

export interface ParticipationAccessCandidate {
  candidateNo: number;
  description: string;
  id: string;
  name: string;
}
export interface ParticipationAccessVoteDetail {
  candidates: ParticipationAccessCandidate[];
  description: string;
  id: string;
  participated: boolean;
  sortOrder: number;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELED';
  title: string;
  type: 'CANDIDATE' | 'YES_NO';
}

export interface ParticipationAccessSession {
  csrfToken?: string;
  hasConfirmedSignature?: boolean;
  permittedActions?: {
    participate: boolean;
    readResults: boolean;
    uploadSignature: boolean;
  };
  scope: ParticipationAccessScope;
  vote?: {
    description: string;
    endedAt: string;
    id: string;
    startedAt: string;
    status: 'FINALIZED' | 'OPEN' | 'CLOSED';
    title: string;
  };
  voteDetails?: ParticipationAccessVoteDetail[];
}

export interface ParticipationResult {
  candidates: Array<{
    candidateId: string;
    candidateNo: number;
    name: string;
    status: 'ACTIVE' | 'WITHDRAWN';
    voteCount: number;
    voteRate: number;
    weightedVoteCount: number;
    weightedVoteRate: number;
  }>;
  participantCount: number;
  participatedVoteWeight: number;
  participationUnit: 'INDIVIDUAL' | 'GROUP';
  privacyMode: 'SECRET' | 'PUBLIC';
  totalVoteCount: number;
  totalWeightedVoteCount: number;
  voteDetailId: string;
  voteWeightMode: 'EQUAL' | 'SHARE';
  votingChannels: Array<{
    channel: 'ONLINE' | 'ONSITE' | 'VISIT';
    participantCount: number;
    participatedVoteWeight: number;
    participationRate: number;
    weightedParticipationRate: number;
  }>;
}

export interface ParticipationInvitationDispatchResult {
  queuedCount: number;
  skippedCount: number;
  totalCount: number;
}
