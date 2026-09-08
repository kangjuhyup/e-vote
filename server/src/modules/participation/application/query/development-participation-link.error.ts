export class DevelopmentParticipationLinkVoteNotFoundError extends Error {
  constructor() {
    super('vote was not found');
    this.name = 'DevelopmentParticipationLinkVoteNotFoundError';
  }
}

export class DevelopmentParticipationLinkAccessDeniedError extends Error {
  constructor() {
    super('only the vote creator can view participation links');
    this.name = 'DevelopmentParticipationLinkAccessDeniedError';
  }
}

export class DevelopmentParticipationLinkNotFoundError extends Error {
  constructor() {
    super('current participation invitation was not found');
    this.name = 'DevelopmentParticipationLinkNotFoundError';
  }
}

export class DevelopmentParticipationLinkMismatchError extends Error {
  constructor() {
    super('current participation invitation must be reissued');
    this.name = 'DevelopmentParticipationLinkMismatchError';
  }
}

export class DevelopmentParticipationDispatchLinkNotFoundError extends Error {
  constructor() {
    super('participation reminder delivery was not found');
    this.name = 'DevelopmentParticipationDispatchLinkNotFoundError';
  }
}

export class DevelopmentParticipationDispatchLinkStaleError extends Error {
  constructor() {
    super('participation link for this reminder delivery is no longer current');
    this.name = 'DevelopmentParticipationDispatchLinkStaleError';
  }
}
