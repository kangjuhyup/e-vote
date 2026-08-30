export class ElectionCommissionNotFoundError extends Error {
  constructor() {
    super('election commission not found');
  }
}

export class ElectionCommissionUnavailableError extends Error {
  constructor() {
    super('election commission is not active');
  }
}
