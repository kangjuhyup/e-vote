export class ElectoralRollNotFoundError extends Error {
  constructor() {
    super('electoral roll not found');
  }
}

export class ElectoralRollMemberNotFoundError extends Error {
  constructor() {
    super('electoral roll member not found');
  }
}
