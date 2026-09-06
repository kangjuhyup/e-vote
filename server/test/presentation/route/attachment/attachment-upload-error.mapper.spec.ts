import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AttachmentAccessDeniedError,
  AttachmentTargetNotFoundError,
} from '../../../../src/modules/vote/application/command/attachment-target.validator';
import { UnsupportedAttachmentMimeTypeError } from '../../../../src/modules/vote/application/command/attachment-upload.policy';
import { UploadedAttachmentObjectNotFoundError } from '../../../../src/modules/vote/application/command/handler/confirm-attachment-upload.handler';
import { StorageNotConfiguredError } from '../../../../src/shared/application/port/gateway/storage.port';
import { throwAttachmentUploadHttpError } from '../../../../src/modules/vote/presentation/attachment/attachment-upload-error.mapper';

describe('throwAttachmentUploadHttpError', () => {
  it('maps validation errors to bad request', () => {
    expect(() =>
      throwAttachmentUploadHttpError(new UnsupportedAttachmentMimeTypeError()),
    ).toThrow(BadRequestException);
  });

  it('maps missing target and object errors to not found', () => {
    expect(() =>
      throwAttachmentUploadHttpError(new AttachmentTargetNotFoundError()),
    ).toThrow(NotFoundException);
    expect(() =>
      throwAttachmentUploadHttpError(
        new UploadedAttachmentObjectNotFoundError(),
      ),
    ).toThrow(NotFoundException);
  });

  it('maps attachment ownership failures to forbidden', () => {
    expect(() =>
      throwAttachmentUploadHttpError(new AttachmentAccessDeniedError()),
    ).toThrow(ForbiddenException);
  });

  it('maps missing storage configuration to service unavailable', () => {
    expect(() =>
      throwAttachmentUploadHttpError(new StorageNotConfiguredError()),
    ).toThrow(ServiceUnavailableException);
  });

  it('rethrows unknown errors', () => {
    const error = new Error('unexpected');

    expect(() => throwAttachmentUploadHttpError(error)).toThrow(error);
  });
});
