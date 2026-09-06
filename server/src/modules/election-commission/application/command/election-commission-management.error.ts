export class ElectionCommissionManagementNotFoundError extends Error {
  constructor() {
    super('election commission or member not found');
  }
}
export class ElectionCommissionAdminRequiredError extends Error {
  constructor() {
    super('active election commission administrator required');
  }
}
export class LastElectionCommissionAdminError extends Error {
  constructor() {
    super('the last active administrator cannot be removed or demoted');
  }
}
