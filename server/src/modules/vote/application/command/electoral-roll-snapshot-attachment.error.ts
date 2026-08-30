export class ElectoralRollSnapshotNotFoundError extends Error {
  constructor() {
    super('electoral roll snapshot not found');
  }
}

export class ElectoralRollCommissionMismatchError extends Error {
  constructor() {
    super(
      'electoral roll snapshot and vote must belong to the same commission',
    );
  }
}

export class VoteElectorsAlreadyExistError extends Error {
  constructor() {
    super('vote already has manually managed electors');
  }
}
