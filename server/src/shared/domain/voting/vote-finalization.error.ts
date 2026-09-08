import { DomainError } from '../domain-error';

export class VoteFinalizationWindowClosedError extends DomainError {
  constructor() {
    super('vote cannot be finalized at or after its start time');
  }
}
