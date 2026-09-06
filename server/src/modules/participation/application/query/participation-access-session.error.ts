export class ParticipationAccessSessionInvalidError extends Error {
  constructor() {
    super('participation access session is invalid');
    this.name = 'ParticipationAccessSessionInvalidError';
  }
}

export class ParticipationAccessCsrfDeniedError extends Error {
  constructor() {
    super('participation access csrf proof is invalid');
    this.name = 'ParticipationAccessCsrfDeniedError';
  }
}
