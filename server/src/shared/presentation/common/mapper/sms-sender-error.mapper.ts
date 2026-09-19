import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { SmsSenderNotConfiguredError } from '../../../application/error/sms-sender.error';
import { DomainError } from '../../../domain/domain-error';

export function throwMappedSmsSenderError(error: unknown): never {
  if (error instanceof SmsSenderNotConfiguredError) {
    throw new ServiceUnavailableException(error.message);
  }
  if (error instanceof DomainError) {
    throw new ConflictException(error.message);
  }

  throw error;
}
