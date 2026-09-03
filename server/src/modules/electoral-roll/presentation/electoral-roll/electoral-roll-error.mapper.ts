import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  DuplicateElectoralRollMemberIdentifierError,
  ElectoralRollMemberNotFoundError,
  ElectoralRollNotFoundError,
  InvalidElectoralRollMemberBatchError,
  InvalidElectoralRollMemberIdentityDataError,
} from '../../application/command/electoral-roll.error';
import { ManagedResourceNotFoundError } from '../../../../shared/application/error/managed-resource.error';
import { DomainError } from '../../../../shared/domain/domain-error';

export function throwMappedElectoralRollError(error: unknown): never {
  if (
    error instanceof InvalidElectoralRollMemberBatchError ||
    error instanceof InvalidElectoralRollMemberIdentityDataError
  ) {
    throw new BadRequestException(error.message);
  }

  if (
    error instanceof ElectoralRollNotFoundError ||
    error instanceof ElectoralRollMemberNotFoundError ||
    error instanceof ManagedResourceNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof DuplicateElectoralRollMemberIdentifierError ||
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
