import { DomainError } from '../../../../shared/domain/domain-error';

export class InvalidParticipationInvitationError extends DomainError {
  constructor() {
    super('participation invitation is invalid');
    this.name = 'InvalidParticipationInvitationError';
  }
}

export class ParticipationInvitationAlreadyClaimedError extends DomainError {
  constructor() {
    super('participation invitation is already claimed');
    this.name = 'ParticipationInvitationAlreadyClaimedError';
  }
}

export class ParticipantSessionExpiredError extends DomainError {
  constructor() {
    super('participant session is expired');
    this.name = 'ParticipantSessionExpiredError';
  }
}

export class ParticipantSessionScopeDeniedError extends DomainError {
  constructor() {
    super('participant session scope is denied');
    this.name = 'ParticipantSessionScopeDeniedError';
  }
}

export class InvalidParticipantSessionError extends DomainError {
  constructor() {
    super('participant session is invalid');
    this.name = 'InvalidParticipantSessionError';
  }
}
