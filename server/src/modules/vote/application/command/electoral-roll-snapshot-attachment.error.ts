export class ElectoralRollSnapshotSourceNotFoundError extends Error {
  constructor() {
    super('electoral roll not found or access denied');
  }
}

export class VoteElectorsAlreadyExistError extends Error {
  constructor() {
    super('vote already has manually managed electors');
  }
}
