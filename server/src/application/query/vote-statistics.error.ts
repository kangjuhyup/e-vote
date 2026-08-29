export class VoteStatisticsNotFoundError extends Error {
  constructor() {
    super('vote statistics not found');
  }
}

export class VoteResultUnavailableError extends Error {
  constructor() {
    super('vote result is available after the vote is closed');
  }
}

export class VoteStatisticsInconsistentError extends Error {
  constructor() {
    super(
      'vote statistics are unavailable because stored data is inconsistent',
    );
  }
}
