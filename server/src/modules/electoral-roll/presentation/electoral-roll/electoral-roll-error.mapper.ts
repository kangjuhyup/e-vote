import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ElectoralRollMemberNotFoundError,
  ElectoralRollNotFoundError,
} from '../../application/command/electoral-roll.error';
import { ManagedResourceNotFoundError } from '../../../../shared/application/error/managed-resource.error';
import { DomainError } from '../../../../shared/domain/domain-error';
import {
  ElectionCommissionNotFoundError,
  ElectionCommissionUnavailableError,
} from '../../../../shared/application/error/election-commission-access.error';

export function throwMappedElectoralRollError(error: unknown): never {
  if (
    error instanceof ElectoralRollNotFoundError ||
    error instanceof ElectoralRollMemberNotFoundError ||
    error instanceof ElectionCommissionNotFoundError ||
    error instanceof ManagedResourceNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
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
