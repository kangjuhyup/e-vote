import { NotFoundException } from '@nestjs/common';
import { AttachmentTargetType } from '../../../../src/application/port/persistence/command/attachment-repository.port';
import { ConfirmAttachmentUploadCommand } from '../../../../src/application/command/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../../src/application/command/handler/confirm-attachment-upload.handler';
import { CreateCandidateCommand } from '../../../../src/application/command/create-candidate.command';
import { CreateCandidateHandler } from '../../../../src/application/command/handler/create-candidate.handler';
import { RequestAttachmentUploadCommand } from '../../../../src/application/command/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../../src/application/command/handler/request-attachment-upload.handler';
import {
  CandidatePageReadView,
  CandidateReadView,
} from '../../../../src/application/query/view/candidate-read.view';
import {
  CandidateNotFoundError,
  GetCandidateHandler,
} from '../../../../src/application/query/handler/get-candidate.handler';
import { GetCandidateQuery } from '../../../../src/application/query/get-candidate.query';
import { GetCandidatePageHandler } from '../../../../src/application/query/handler/get-candidate-page.handler';
import { GetCandidatePageQuery } from '../../../../src/application/query/get-candidate-page.query';
import { CandidateStatus } from '../../../../src/domain/candidate/type/candidate-status.type';
import { CandidateAttachmentController } from '../../../../src/presentation/route/candidate/candidate-attachment.controller';
import { CandidateReadController } from '../../../../src/presentation/route/candidate/candidate-read.controller';
import { CandidateController } from '../../../../src/presentation/route/candidate/candidate.controller';

describe('CandidateController', () => {
  const createCandidateExecute = jest.fn<
    ReturnType<CreateCandidateHandler['execute']>,
    [CreateCandidateCommand]
  >();
  const createCandidateHandler = {
    execute: createCandidateExecute,
  } as unknown as jest.Mocked<CreateCandidateHandler>;
  const getCandidateExecute = jest.fn<
    ReturnType<GetCandidateHandler['execute']>,
    [GetCandidateQuery]
  >();
  const getCandidateHandler = {
    execute: getCandidateExecute,
  } as unknown as jest.Mocked<GetCandidateHandler>;
  const getCandidatePageExecute = jest.fn<
    ReturnType<GetCandidatePageHandler['execute']>,
    [GetCandidatePageQuery]
  >();
  const getCandidatePageHandler = {
    execute: getCandidatePageExecute,
  } as unknown as jest.Mocked<GetCandidatePageHandler>;
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

  let controller: CandidateController;
  let readController: CandidateReadController;
  let attachmentController: CandidateAttachmentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CandidateController(createCandidateHandler);
    readController = new CandidateReadController(
      getCandidateHandler,
      getCandidatePageHandler,
    );
    attachmentController = new CandidateAttachmentController(
      requestAttachmentUploadHandler,
      confirmAttachmentUploadHandler,
    );
  });

  it('maps GET /votes/:voteId/sub-votes/:voteDetailId/candidates to get candidate page handler', async () => {
    getCandidatePageExecute.mockResolvedValue(
      CandidatePageReadView.of({
        items: [createCandidateReadView()],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      }),
    );

    const response = await readController.getCandidatePage(
      {
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      },
      {},
    );

    expect(response).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 1,
      items: [
        {
          id: 'candidate-1',
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
          name: 'Kim',
          createdAt: '2026-08-13T00:00:00.000Z',
        },
      ],
    });
    expect(getCandidatePageExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      page: 1,
      pageSize: 20,
    });
  });

  it('maps GET /votes/:voteId/sub-votes/:voteDetailId/candidates/:candidateId to get candidate handler', async () => {
    getCandidateExecute.mockResolvedValue(createCandidateReadView());

    const response = await readController.getCandidate({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      candidateId: 'candidate-1',
    });

    expect(response).toMatchObject({
      id: 'candidate-1',
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      candidateNo: 1,
      name: 'Kim',
      status: CandidateStatus.Active,
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T01:00:00.000Z',
    });
    expect(getCandidateExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      candidateId: 'candidate-1',
    });
  });

  it('maps missing candidate to 404', async () => {
    getCandidateExecute.mockRejectedValue(new CandidateNotFoundError());

    await expect(
      readController.getCandidate({
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
        candidateId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps PUT /votes/:voteId/sub-votes/:voteDetailId/candidates to create candidate handler', async () => {
    createCandidateExecute.mockResolvedValue({
      id: 'candidate-1',
      voteDetailId: 'vote-detail-1',
      status: CandidateStatus.Active,
    });

    const response = await controller.createCandidate(
      {
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      },
      {
        candidateNo: 1,
        name: 'Kim',
      },
    );

    expect(response).toEqual({
      id: 'candidate-1',
      voteDetailId: 'vote-detail-1',
      status: CandidateStatus.Active,
    });
    expect(createCandidateExecute).toHaveBeenCalledTimes(1);
    expect(createCandidateExecute.mock.calls[0][0]).toMatchObject({
      voteDetailId: 'vote-detail-1',
      candidateNo: 1,
      name: 'Kim',
    });
  });

  it('maps POST /votes/:voteId/sub-votes/:voteDetailId/candidates/:candidateId/attachments/upload-url to request attachment upload handler', async () => {
    requestAttachmentUploadExecute.mockResolvedValue({
      storageKey: 'attachments/candidate-key',
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });

    const response =
      await attachmentController.requestCandidateAttachmentUpload(
        {
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
          candidateId: 'candidate-1',
        },
        {
          attachmentType: 'POSTER',
          originalName: 'poster.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
        },
      );

    expect(response).toEqual({
      storageKey: 'attachments/candidate-key',
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });
    expect(requestAttachmentUploadExecute.mock.calls[0][0]).toMatchObject({
      target: {
        targetType: AttachmentTargetType.Candidate,
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
        candidateId: 'candidate-1',
      },
      attachmentType: 'POSTER',
      originalName: 'poster.png',
      mimeType: 'image/png',
      sizeBytes: 1024,
      sortOrder: 0,
    });
  });

  it('maps POST /votes/:voteId/sub-votes/:voteDetailId/candidates/:candidateId/attachments/confirm to confirm attachment upload handler', async () => {
    confirmAttachmentUploadExecute.mockResolvedValue({
      attachmentId: 'attachment-1',
      fileId: 'file-1',
      storageKey: 'attachments/candidate-key',
    });

    const response =
      await attachmentController.confirmCandidateAttachmentUpload(
        {
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
          candidateId: 'candidate-1',
        },
        {
          storageKey: 'attachments/candidate-key',
          attachmentType: 'PROFILE_IMAGE',
          originalName: 'profile.png',
          mimeType: 'image/png',
          sizeBytes: 2048,
        },
      );

    expect(response).toEqual({
      attachmentId: 'attachment-1',
      fileId: 'file-1',
      storageKey: 'attachments/candidate-key',
    });
    expect(confirmAttachmentUploadExecute.mock.calls[0][0]).toMatchObject({
      target: {
        targetType: AttachmentTargetType.Candidate,
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
        candidateId: 'candidate-1',
      },
      storageKey: 'attachments/candidate-key',
      attachmentType: 'PROFILE_IMAGE',
      originalName: 'profile.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
      sortOrder: 0,
    });
  });
});

function createCandidateReadView(): CandidateReadView {
  return CandidateReadView.of({
    id: 'candidate-1',
    voteId: 'vote-1',
    voteDetailId: 'vote-detail-1',
    candidateNo: 1,
    name: 'Kim',
    description: '',
    status: CandidateStatus.Active,
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
    updatedAt: new Date('2026-08-13T01:00:00.000Z'),
  });
}
