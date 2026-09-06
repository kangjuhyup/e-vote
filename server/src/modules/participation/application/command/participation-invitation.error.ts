export class ParticipationInvitationAccessDeniedError extends Error {
  constructor() {
    super('only the vote creator can manage participation invitations');
    this.name = 'ParticipationInvitationAccessDeniedError';
  }
}

export class ParticipationInvitationIdentityPolicyError extends Error {
  constructor() {
    super('participation invitations require optional identity verification');
    this.name = 'ParticipationInvitationIdentityPolicyError';
  }
}

export class ParticipationInvitationStateError extends Error {
  constructor() {
    super('vote state does not allow participation invitations');
    this.name = 'ParticipationInvitationStateError';
  }
}

export class ParticipationInvitationVoteNotFoundError extends Error {
  constructor() {
    super('vote was not found');
    this.name = 'ParticipationInvitationVoteNotFoundError';
  }
}
