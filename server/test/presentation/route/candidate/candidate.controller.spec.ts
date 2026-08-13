import { AttachmentTargetType } from '../../../../src/application/port/attachment-repository.port';
import { ConfirmAttachmentUploadCommand } from '../../../../src/application/command/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../../src/application/command/confirm-attachment-upload.handler';
import { CreateCandidateCommand } from '../../../../src/application/command/create-candidate.command';
import { CreateCandidateHandler } from '../../../../src/application/command/create-candidate.handler';
import { RequestAttachmentUploadCommand } from '../../../../src/application/command/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../../src/application/command/request-attachment-upload.handler';
import { CandidateStatus } from '../../../../src/domain/candidate/type/candidate-status.type';
import { CandidateController } from '../../../../src/presentation/route/candidate/candidate.controller';

describe('CandidateController', () => {
  const createCandidateExecute = jest.fn<
    ReturnType<CreateCandidateHandler['execute']>,
    [CreateCandidateCommand]
  >();
  const createCandidateHandler = {
    execute: createCandidateExecute,
  } as unknown as jest.Mocked<CreateCandidateHandler>;
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

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CandidateController(
      createCandidateHandler,
      requestAttachmentUploadHandler,
      confirmAttachmentUploadHandler,
    );
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

    const response = await controller.requestCandidateAttachmentUpload(
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

    const response = await controller.confirmCandidateAttachmentUpload(
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
