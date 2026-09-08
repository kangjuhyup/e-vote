export interface DispatchParticipationInvitationsInput {
  electorIds?: string[];
  voteId: string;
}
export interface ReissueParticipationInvitationInput {
  electorId: string;
  voteId: string;
}

export interface ParticipationInvitationDevelopmentLink {
  electorId: string;
  participationUrl: string;
}

export interface ParticipationInvitationDispatchResult {
  queuedCount: number;
  skippedCount: number;
  totalCount: number;
}
