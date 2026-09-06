import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AttachmentAccessDeniedError,
  AttachmentTargetNotFoundError,
} from '../../application/command/attachment-target.validator';
import { AttachmentNotFoundError } from '../../application/command/attachment.error';
import {
  AttachmentSizeExceededError,
  EmptyAttachmentFileNameError,
  InvalidAttachmentSizeError,
  UnsupportedAttachmentMimeTypeError,
  UnsupportedAttachmentTypeError,
} from '../../application/command/attachment-upload.policy';
import {
  UploadedAttachmentMetadataMismatchError,
  UploadedAttachmentObjectNotFoundError,
} from '../../application/command/handler/confirm-attachment-upload.handler';
import { StorageNotConfiguredError } from '../../../../shared/application/port/gateway/storage.port';

export function throwAttachmentUploadHttpError(error: unknown): never {
  if (error instanceof AttachmentAccessDeniedError) {
    throw new ForbiddenException(error.message);
  }

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
    error instanceof AttachmentNotFoundError ||
    error instanceof UploadedAttachmentObjectNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof StorageNotConfiguredError) {
    throw new ServiceUnavailableException('storage is not configured');
  }

  throw error;
}
