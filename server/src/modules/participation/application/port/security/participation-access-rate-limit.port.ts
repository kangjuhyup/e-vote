export const PARTICIPATION_ACCESS_RATE_LIMIT_PORT = Symbol(
  'PARTICIPATION_ACCESS_RATE_LIMIT_PORT',
);

export interface ParticipationAccessRateLimitPort {
  consume(params: {
    readonly clientAddress: string;
    readonly referenceToken: string;
  }): Promise<void>;
}

export class ParticipationAccessRateLimitExceededError extends Error {
  constructor() {
    super('participation access exchange rate limit exceeded');
    this.name = 'ParticipationAccessRateLimitExceededError';
  }
}

export class ParticipationAccessRateLimitUnavailableError extends Error {
  constructor() {
    super('participation access exchange rate limiter is unavailable');
    this.name = 'ParticipationAccessRateLimitUnavailableError';
  }
}
