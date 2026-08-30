import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ElectoralRollCommissionMismatchError,
  ElectoralRollSnapshotNotFoundError,
  VoteElectorsAlreadyExistError,
} from '../../application/command/electoral-roll-snapshot-attachment.error';
import { ManagedResourceNotFoundError } from '../../../../shared/application/error/managed-resource.error';

export function throwMappedVoteElectoralRollError(error: unknown): never {
  if (
    error instanceof ElectoralRollSnapshotNotFoundError ||
    error instanceof ManagedResourceNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof ElectoralRollCommissionMismatchError ||
    error instanceof VoteElectorsAlreadyExistError
  ) {
    throw new ConflictException(error.message);
  }

  throw error;
}
