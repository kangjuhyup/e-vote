export const ELECTOR_PARTICIPANT_ACCESS_PORT = Symbol(
  'ELECTOR_PARTICIPANT_ACCESS_PORT',
);

export class ElectorParticipantForbiddenError extends Error {
  constructor() {
    super('authenticated participant does not own this elector');
  }
}

export interface ElectorParticipantAccessPort {
  isAuthorized(
    voteId: string,
    electorId: string,
    userPrincipalId: string,
  ): Promise<boolean>;
}
