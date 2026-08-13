import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AttachmentTargetNotFoundError } from '../../../../src/application/command/attachment-target.validator';
import { UnsupportedAttachmentMimeTypeError } from '../../../../src/application/command/attachment-upload.policy';
import { UploadedAttachmentObjectNotFoundError } from '../../../../src/application/command/confirm-attachment-upload.handler';
import { StorageNotConfiguredError } from '../../../../src/application/port/storage.port';
import { throwAttachmentUploadHttpError } from '../../../../src/presentation/route/attachment/attachment-upload-error.mapper';

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
