export class BillingOrderNotFoundError extends Error {
  constructor() {
    super('billing order not found');
  }
}

export class BillingOrderAccessDeniedError extends Error {
  constructor() {
    super('billing order access denied');
  }
}

export class VoteBillingAccessDeniedError extends Error {
  constructor() {
    super('vote billing access denied');
  }
}
