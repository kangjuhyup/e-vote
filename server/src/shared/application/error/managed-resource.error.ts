export class ManagedResourceNotFoundError extends Error {
  constructor(
    resource:
      'candidate' | 'elector' | 'field voting session' | 'vote' | 'vote detail',
  ) {
    super(`${resource} not found`);
  }
}

export class ManagedResourceScopeMismatchError extends Error {
  constructor() {
    super('resource does not belong to requested vote scope');
  }
}
