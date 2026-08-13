import { AttachmentTargetType } from '../../../../src/application/port/attachment-repository.port';
import { ConfirmAttachmentUploadCommand } from '../../../../src/application/command/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../../src/application/command/confirm-attachment-upload.handler';
import { CreateVoteDetailCommand } from '../../../../src/application/command/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../../../src/application/command/create-vote-detail.handler';
import { RequestAttachmentUploadCommand } from '../../../../src/application/command/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../../src/application/command/request-attachment-upload.handler';
import { VoteDetailStatus } from '../../../../src/domain/vote/type/vote-status.type';
import { VoteDetailController } from '../../../../src/presentation/route/vote-detail/vote-detail.controller';

describe('VoteDetailController', () => {
  const createVoteDetailExecute = jest.fn<
    ReturnType<CreateVoteDetailHandler['execute']>,
    [CreateVoteDetailCommand]
  >();
  const createVoteDetailHandler = {
    execute: createVoteDetailExecute,
  } as unknown as jest.Mocked<CreateVoteDetailHandler>;
  const requestAttachmentUploadExecute = jest.fn<
    ReturnType<RequestAttachmentUploadHandler['execute']>,
    [RequestAttachmentUploadCommand]
  >();
  const requestAttachmentUploadHandler = {
    execute: requestAttachmentUploadExecute,
  } as unknown as jest.Mocked<RequestAttachmentUploadHandler>;
  const confirmAttachmentUploadExecute = jest.fn<
    ReturnType<ConfirmAttachmentUploadHandler['execute']>,
    [ConfirmAttachmentUploadCommand]
  >();
  const confirmAttachmentUploadHandler = {
    execute: confirmAttachmentUploadExecute,
  } as unknown as jest.Mocked<ConfirmAttachmentUploadHandler>;

  let controller: VoteDetailController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VoteDetailController(
      createVoteDetailHandler,
      requestAttachmentUploadHandler,
      confirmAttachmentUploadHandler,
    );
  });

  it('maps PUT /votes/:voteId/sub-votes to create vote detail handler', async () => {
    createVoteDetailExecute.mockResolvedValue({
      id: 'vote-detail-1',
      voteId: 'vote-1',
      status: VoteDetailStatus.Draft,
    });

    const response = await controller.createVoteDetail(
      { voteId: 'vote-1' },
      {
        title: 'President',
        type: 'CANDIDATE',
        sortOrder: 0,
      },
    );

    expect(response).toEqual({
      id: 'vote-detail-1',
      voteId: 'vote-1',
      status: VoteDetailStatus.Draft,
    });
    expect(createVoteDetailExecute).toHaveBeenCalledTimes(1);
    expect(createVoteDetailExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      title: 'President',
      type: 'CANDIDATE',
    });
  });

  it('maps POST /votes/:voteId/sub-votes/:voteDetailId/attachments/upload-url to request attachment upload handler', async () => {
    requestAttachmentUploadExecute.mockResolvedValue({
      storageKey: 'attachments/detail-key',
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });

    const response = await controller.requestVoteDetailAttachmentUpload(
      {
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      },
      {
        attachmentType: 'NOTICE',
        originalName: 'notice.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      },
    );

    expect(response).toEqual({
      storageKey: 'attachments/detail-key',
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });
    expect(requestAttachmentUploadExecute.mock.calls[0][0]).toMatchObject({
      target: {
        targetType: AttachmentTargetType.VoteDetail,
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      },
      attachmentType: 'NOTICE',
      originalName: 'notice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      sortOrder: 0,
    });
  });

  it('maps POST /votes/:voteId/sub-votes/:voteDetailId/attachments/confirm to confirm attachment upload handler', async () => {
    confirmAttachmentUploadExecute.mockResolvedValue({
      attachmentId: 'attachment-1',
      fileId: 'file-1',
      storageKey: 'attachments/detail-key',
    });

    const response = await controller.confirmVoteDetailAttachmentUpload(
      {
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      },
      {
        storageKey: 'attachments/detail-key',
        attachmentType: 'GUIDE',
        originalName: 'guide.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        sortOrder: 2,
      },
    );

    expect(response).toEqual({
      attachmentId: 'attachment-1',
      fileId: 'file-1',
      storageKey: 'attachments/detail-key',
    });
    expect(confirmAttachmentUploadExecute.mock.calls[0][0]).toMatchObject({
      target: {
        targetType: AttachmentTargetType.VoteDetail,
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      },
      storageKey: 'attachments/detail-key',
      attachmentType: 'GUIDE',
      originalName: 'guide.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      sortOrder: 2,
    });
  });
});
