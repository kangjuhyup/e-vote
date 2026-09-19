import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ManagedResourceNotFoundError } from '../../../../shared/application/error/managed-resource.error';
import { DomainError } from '../../../../shared/domain/domain-error';
import {
  BillingOrderAccessDeniedError,
  BillingOrderNotFoundError,
  VoteBillingAccessDeniedError,
  TestPaymentUnavailableError,
} from '../../application/billing.error';

export function throwMappedBillingError(error: unknown): never {
  if (error instanceof TestPaymentUnavailableError) {
    throw new ServiceUnavailableException(error.message);
  }
  if (
    error instanceof BillingOrderNotFoundError ||
    error instanceof ManagedResourceNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }
  if (
    error instanceof BillingOrderAccessDeniedError ||
    error instanceof VoteBillingAccessDeniedError
  ) {
    throw new ForbiddenException(error.message);
  }
  if (error instanceof DomainError) {
    throw new ConflictException(error.message);
  }

  throw error;
}
