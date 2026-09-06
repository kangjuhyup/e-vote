export class ParticipationAccessConflictError extends Error {
  constructor() {
    super('participation access is already claimed by another browser');
    this.name = 'ParticipationAccessConflictError';
  }
}

export class ParticipationAccessUnavailableError extends Error {
  constructor() {
    super('participation access is unavailable');
    this.name = 'ParticipationAccessUnavailableError';
  }
}

export class ParticipationAccessInvalidError extends Error {
  constructor() {
    super('participation access is invalid');
    this.name = 'ParticipationAccessInvalidError';
  }
}
