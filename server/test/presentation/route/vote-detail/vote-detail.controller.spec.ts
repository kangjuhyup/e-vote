import { NotFoundException } from '@nestjs/common';
import { AttachmentTargetType } from '../../../../src/modules/vote/application/port/persistence/command/attachment-repository.port';
import { ConfirmAttachmentUploadCommand } from '../../../../src/modules/vote/application/command/dto/request/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../../src/modules/vote/application/command/handler/confirm-attachment-upload.handler';
import { CreateVoteDetailCommand } from '../../../../src/modules/vote/application/command/dto/request/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../../../src/modules/vote/application/command/handler/create-vote-detail.handler';
import { RequestAttachmentUploadCommand } from '../../../../src/modules/vote/application/command/dto/request/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../../src/modules/vote/application/command/handler/request-attachment-upload.handler';
import {
  GetVoteDetailHandler,
  VoteDetailNotFoundError,
} from '../../../../src/modules/vote/application/query/handler/get-vote-detail.handler';
import { GetVoteDetailQuery } from '../../../../src/modules/vote/application/query/dto/request/get-vote-detail.query';
import { GetVoteDetailPageHandler } from '../../../../src/modules/vote/application/query/handler/get-vote-detail-page.handler';
import { GetVoteDetailPageQuery } from '../../../../src/modules/vote/application/query/dto/request/get-vote-detail-page.query';
import {
  VoteDetailPageReadView,
  VoteDetailPolicyOverridesReadView,
  VoteDetailReadView,
} from '../../../../src/modules/vote/application/query/dto/response/vote-detail-read.view';
import { PrivacyMode } from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteDetailStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VoteDetailAttachmentController } from '../../../../src/modules/vote/presentation/vote-detail/vote-detail-attachment.controller';
import { VoteDetailReadController } from '../../../../src/modules/vote/presentation/vote-detail/vote-detail-read.controller';
import { VoteDetailController } from '../../../../src/modules/vote/presentation/vote-detail/vote-detail.controller';

describe('VoteDetailController', () => {
  const createVoteDetailExecute = jest.fn<
    ReturnType<CreateVoteDetailHandler['execute']>,
    [CreateVoteDetailCommand]
  >();
  const createVoteDetailHandler = {
    execute: createVoteDetailExecute,
  } as unknown as jest.Mocked<CreateVoteDetailHandler>;
  const getVoteDetailExecute = jest.fn<
    ReturnType<GetVoteDetailHandler['execute']>,
    [GetVoteDetailQuery]
  >();
  const getVoteDetailHandler = {
    execute: getVoteDetailExecute,
  } as unknown as jest.Mocked<GetVoteDetailHandler>;
  const getVoteDetailPageExecute = jest.fn<
    ReturnType<GetVoteDetailPageHandler['execute']>,
    [GetVoteDetailPageQuery]
  >();
  const getVoteDetailPageHandler = {
    execute: getVoteDetailPageExecute,
  } as unknown as jest.Mocked<GetVoteDetailPageHandler>;
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
  let readController: VoteDetailReadController;
  let attachmentController: VoteDetailAttachmentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VoteDetailController(createVoteDetailHandler);
    readController = new VoteDetailReadController(
      getVoteDetailHandler,
      getVoteDetailPageHandler,
    );
    attachmentController = new VoteDetailAttachmentController(
      requestAttachmentUploadHandler,
      confirmAttachmentUploadHandler,
    );
  });

  it('maps GET /votes/:voteId/sub-votes to get vote detail page handler', async () => {
    getVoteDetailPageExecute.mockResolvedValue(
      VoteDetailPageReadView.of({
        items: [createVoteDetailReadView()],
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      }),
    );

    const response = await readController.getVoteDetailPage(
      { voteId: 'vote-1' },
      {
        page: '2',
        pageSize: '10',
      },
    );

    expect(response).toMatchObject({
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
      items: [
        {
          id: 'vote-detail-1',
          voteId: 'vote-1',
          title: 'President',
          status: VoteDetailStatus.Draft,
          createdAt: '2026-08-13T00:00:00.000Z',
        },
      ],
    });
    expect(getVoteDetailPageExecute).toHaveBeenCalledTimes(1);
    expect(getVoteDetailPageExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      page: 2,
      pageSize: 10,
    });
  });

  it('maps GET /votes/:voteId/sub-votes/:voteDetailId to get vote detail handler', async () => {
    getVoteDetailExecute.mockResolvedValue(createVoteDetailReadView());

    const response = await readController.getVoteDetail({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
    });

    expect(response).toMatchObject({
      id: 'vote-detail-1',
      voteId: 'vote-1',
      title: 'President',
      overrides: {
        privacyMode: PrivacyMode.Public,
      },
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T01:00:00.000Z',
    });
    expect(getVoteDetailExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
    });
  });

  it('maps missing vote detail to 404', async () => {
    getVoteDetailExecute.mockRejectedValue(new VoteDetailNotFoundError());

    await expect(
      readController.getVoteDetail({
        voteId: 'vote-1',
        voteDetailId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
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

    const response =
      await attachmentController.requestVoteDetailAttachmentUpload(
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

    const response =
      await attachmentController.confirmVoteDetailAttachmentUpload(
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

function createVoteDetailReadView(): VoteDetailReadView {
  return VoteDetailReadView.of({
    id: 'vote-detail-1',
    voteId: 'vote-1',
    title: 'President',
    description: '',
    type: 'CANDIDATE',
    overrides: VoteDetailPolicyOverridesReadView.of({
      privacyMode: PrivacyMode.Public,
    }),
    sortOrder: 0,
    status: VoteDetailStatus.Draft,
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
    updatedAt: new Date('2026-08-13T01:00:00.000Z'),
  });
}
