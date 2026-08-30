import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ElectoralRollCommissionMismatchError,
  ElectoralRollMemberNotFoundError,
  ElectoralRollNotFoundError,
  ElectoralRollSnapshotNotFoundError,
  VoteElectorsAlreadyExistError,
} from '../../../application/command/electoral-roll.error';
import { ManagedResourceNotFoundError } from '../../../application/command/vote-management.error';
import { DomainError } from '../../../domain/shared/domain-error';
import {
  ElectionCommissionNotFoundError,
  ElectionCommissionUnavailableError,
} from '../../../application/command/handler/create-vote.handler';

export function throwMappedElectoralRollError(error: unknown): never {
  if (
    error instanceof ElectoralRollNotFoundError ||
    error instanceof ElectoralRollMemberNotFoundError ||
    error instanceof ElectoralRollSnapshotNotFoundError ||
    error instanceof ElectionCommissionNotFoundError ||
    error instanceof ManagedResourceNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof ElectoralRollCommissionMismatchError ||
    error instanceof VoteElectorsAlreadyExistError ||
    error instanceof ElectionCommissionUnavailableError ||
    error instanceof DomainError ||
    isUniqueConstraintError(error)
  ) {
    throw new ConflictException(
      error instanceof Error ? error.message : 'electoral roll conflict',
    );
  }

  throw error;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    readonly code?: unknown;
    readonly name?: unknown;
  };

  return (
    candidate.code === '23505' ||
    candidate.name === 'UniqueConstraintViolationException'
  );
}
