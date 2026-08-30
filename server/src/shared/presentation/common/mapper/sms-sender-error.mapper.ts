import { ServiceUnavailableException } from '@nestjs/common';
import { SmsSenderNotConfiguredError } from '../../../application/error/sms-sender.error';

export function throwMappedSmsSenderError(error: unknown): never {
  if (error instanceof SmsSenderNotConfiguredError) {
    throw new ServiceUnavailableException(error.message);
  }

  throw error;
}
