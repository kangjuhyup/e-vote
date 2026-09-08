import { ParticipantSignatureUploadHandler } from '../../../../src/modules/participation/application/command/handler/participant-signature-upload.handler';
import type { ResolveParticipationAccessSessionHandler } from '../../../../src/modules/participation/application/query/handler/resolve-participation-access-session.handler';
import type { ElectorSignatureOperationPort } from '../../../../src/shared/application/port/capability/participant-operations.port';

/* eslint-disable @typescript-eslint/unbound-method -- Jest verifies an injected handler mock without invoking an unbound implementation. */

describe('ParticipantSignatureUploadHandler', () => {
  it('derives signature owner from the capability session for request and confirm', async () => {
    const sessions = {
      execute: jest.fn().mockResolvedValue({
        sessionId: 'session-1',
        invitationId: 'invitation-1',
        voteId: 'vote-1',
        electorId: 'elector-1',
        scope: 'PARTICIPATE',
      }),
    } as unknown as jest.Mocked<ResolveParticipationAccessSessionHandler>;
    const requestUpload = jest.fn().mockResolvedValue({
      storageKey: 'key',
      uploadUrl: 'https://storage.example/upload',
      uploadHeaders: {
        'Content-Type': 'image/png',
        'x-amz-meta-purpose': 'elector-participation-signature',
      },
      expiresAt: new Date('2026-09-06T12:10:00.000Z'),
    });
    let capturedReauthorize: (() => Promise<void>) | undefined;
    const confirmUpload = jest
      .fn<
        ReturnType<ElectorSignatureOperationPort['confirmUpload']>,
        Parameters<ElectorSignatureOperationPort['confirmUpload']>
      >()
      .mockImplementation((_command, reauthorize) => {
        capturedReauthorize = reauthorize;
        return Promise.resolve({ fileId: 'file-1', storageKey: 'key' });
      });
    const signatures = {
      requestUpload,
      confirmUpload,
    } satisfies jest.Mocked<ElectorSignatureOperationPort>;
    const handler = new ParticipantSignatureUploadHandler(sessions, signatures);
    const base = {
      sessionToken: 'session-token',
      csrfToken: 'csrf-token',
      originalName: 'signature.png',
      mimeType: 'image/png',
      sizeBytes: 123,
    };

    await handler.requestUpload(base);
    await handler.confirmUpload({
      ...base,
      storageKey: 'key',
      checksum: 'sha256',
    });

    expect(requestUpload).toHaveBeenCalledWith({
      voteId: 'vote-1',
      electorId: 'elector-1',
      originalName: 'signature.png',
      mimeType: 'image/png',
      sizeBytes: 123,
    });
    expect(confirmUpload).toHaveBeenCalledWith(
      {
        voteId: 'vote-1',
        electorId: 'elector-1',
        storageKey: 'key',
        originalName: 'signature.png',
        mimeType: 'image/png',
        sizeBytes: 123,
        checksum: 'sha256',
      },
      expect.any(Function),
    );
    await capturedReauthorize?.();
    expect(sessions.execute).toHaveBeenCalledTimes(3);
  });
});
