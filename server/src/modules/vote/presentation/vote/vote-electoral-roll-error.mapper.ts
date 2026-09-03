import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ElectoralRollSnapshotSourceNotFoundError,
  VoteElectorsAlreadyExistError,
  ElectoralRollIdentityVerificationDataRequiredError,
} from '../../application/command/electoral-roll-snapshot-attachment.error';
import { ManagedResourceNotFoundError } from '../../../../shared/application/error/managed-resource.error';

export function throwMappedVoteElectoralRollError(error: unknown): never {
  if (
    error instanceof ElectoralRollSnapshotSourceNotFoundError ||
    error instanceof ManagedResourceNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof VoteElectorsAlreadyExistError) {
    throw new ConflictException(error.message);
  }

  if (error instanceof ElectoralRollIdentityVerificationDataRequiredError) {
    throw new BadRequestException(error.message);
  }

  throw error;
}
