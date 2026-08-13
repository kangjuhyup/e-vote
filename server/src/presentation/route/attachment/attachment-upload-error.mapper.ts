import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AttachmentTargetNotFoundError } from '../../../application/command/attachment-target.validator';
import {
  AttachmentSizeExceededError,
  EmptyAttachmentFileNameError,
  InvalidAttachmentSizeError,
  UnsupportedAttachmentMimeTypeError,
  UnsupportedAttachmentTypeError,
} from '../../../application/command/attachment-upload.policy';
import {
  UploadedAttachmentMetadataMismatchError,
  UploadedAttachmentObjectNotFoundError,
} from '../../../application/command/confirm-attachment-upload.handler';
import { StorageNotConfiguredError } from '../../../application/port/storage.port';

export function throwAttachmentUploadHttpError(error: unknown): never {
  if (
    error instanceof EmptyAttachmentFileNameError ||
    error instanceof InvalidAttachmentSizeError ||
    error instanceof AttachmentSizeExceededError ||
    error instanceof UnsupportedAttachmentMimeTypeError ||
    error instanceof UnsupportedAttachmentTypeError ||
    error instanceof UploadedAttachmentMetadataMismatchError
  ) {
    throw new BadRequestException(error.message);
  }

  if (
    error instanceof AttachmentTargetNotFoundError ||
    error instanceof UploadedAttachmentObjectNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof StorageNotConfiguredError) {
    throw new ServiceUnavailableException('storage is not configured');
  }

  throw error;
}
