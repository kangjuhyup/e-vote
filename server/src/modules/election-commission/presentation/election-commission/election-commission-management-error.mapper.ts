import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DomainError } from '../../../../shared/domain/domain-error';
import {
  ElectionCommissionAdminRequiredError,
  ElectionCommissionManagementNotFoundError,
  LastElectionCommissionAdminError,
} from '../../application/command/election-commission-management.error';
export function throwMappedElectionCommissionManagementError(
  error: unknown,
): never {
  if (error instanceof ElectionCommissionAdminRequiredError)
    throw new ForbiddenException(error.message);
  if (error instanceof ElectionCommissionManagementNotFoundError)
    throw new NotFoundException(error.message);
  if (
    error instanceof LastElectionCommissionAdminError ||
    error instanceof DomainError
  )
    throw new ConflictException(error.message);
  throw error;
}
