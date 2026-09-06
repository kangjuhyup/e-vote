import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfirmElectorSignatureUploadCommand } from '../../../../src/modules/elector/application/command/dto/request/confirm-elector-signature-upload.command';
import { RequestElectorSignatureUploadCommand } from '../../../../src/modules/elector/application/command/dto/request/request-elector-signature-upload.command';
import {
  ConfirmElectorSignatureUploadHandler,
  ElectorSignatureMetadataMismatchError,
  ElectorSignatureObjectNotFoundError,
} from '../../../../src/modules/elector/application/command/handler/confirm-elector-signature-upload.handler';
import { RequestElectorSignatureUploadHandler } from '../../../../src/modules/elector/application/command/handler/request-elector-signature-upload.handler';
import { ElectorParticipantForbiddenError } from '../../../../src/shared/application/port/capability/elector-participant-access.port';
import { ElectorSignatureController } from '../../../../src/modules/elector/presentation/elector/elector-signature.controller';
import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';

describe('ElectorSignatureController', () => {
  const requestExecute = jest.fn<
    ReturnType<RequestElectorSignatureUploadHandler['execute']>,
    [RequestElectorSignatureUploadCommand]
  >();
  const confirmExecute = jest.fn<
    ReturnType<ConfirmElectorSignatureUploadHandler['execute']>,
    [ConfirmElectorSignatureUploadCommand]
  >();
  const controller = new ElectorSignatureController(
    { execute: requestExecute } as never,
    { execute: confirmExecute } as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('maps upload URL and confirm requests to the authenticated elector commands', async () => {
    requestExecute.mockResolvedValue({
      storageKey: 'signatures/opaque',
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2026-09-06T03:05:00.000Z'),
    });
    confirmExecute.mockResolvedValue({
      fileId: 'file-1',
      storageKey: 'signatures/opaque',
    });

    await expect(
      controller.requestUpload(
        TEST_USER_PRINCIPAL,
        { voteId: 'vote-1', electorId: 'elector-1' },
        { originalName: 'signature.png', mimeType: 'image/png', sizeBytes: 64 },
      ),
    ).resolves.toMatchObject({ storageKey: 'signatures/opaque' });
    await expect(
      controller.confirmUpload(
        TEST_USER_PRINCIPAL,
        { voteId: 'vote-1', electorId: 'elector-1' },
        {
          storageKey: 'signatures/opaque',
          originalName: 'signature.png',
          mimeType: 'image/png',
          sizeBytes: 64,
        },
      ),
    ).resolves.toEqual({ fileId: 'file-1', storageKey: 'signatures/opaque' });

    expect(requestExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      electorId: 'elector-1',
      userPrincipalId: TEST_USER_PRINCIPAL.id,
    });
    expect(confirmExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      electorId: 'elector-1',
      userPrincipalId: TEST_USER_PRINCIPAL.id,
    });
  });

  it.each([
    [new ElectorParticipantForbiddenError(), ForbiddenException],
    [new ElectorSignatureObjectNotFoundError(), NotFoundException],
    [new ElectorSignatureMetadataMismatchError(), BadRequestException],
  ])('maps signature errors to HTTP exceptions', async (error, expected) => {
    confirmExecute.mockRejectedValue(error);

    await expect(
      controller.confirmUpload(
        TEST_USER_PRINCIPAL,
        { voteId: 'vote-1', electorId: 'elector-1' },
        {
          storageKey: 'signatures/opaque',
          originalName: 'signature.png',
          mimeType: 'image/png',
          sizeBytes: 64,
        },
      ),
    ).rejects.toBeInstanceOf(expected);
  });
});
