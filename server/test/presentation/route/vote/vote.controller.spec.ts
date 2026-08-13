import { AttachmentTargetType } from '../../../../src/application/port/attachment-repository.port';
import { ConfirmAttachmentUploadCommand } from '../../../../src/application/command/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../../src/application/command/confirm-attachment-upload.handler';
import { CreateVoteHandler } from '../../../../src/application/command/create-vote.handler';
import { CreateVoteCommand } from '../../../../src/application/command/create-vote.command';
import { RequestAttachmentUploadCommand } from '../../../../src/application/command/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../../src/application/command/request-attachment-upload.handler';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';
import { VoteController } from '../../../../src/presentation/route/vote/vote.controller';

describe('VoteController', () => {
  const createVoteExecute = jest.fn<
    ReturnType<CreateVoteHandler['execute']>,
    [CreateVoteCommand]
  >();
  const createVoteHandler = {
    execute: createVoteExecute,
  } as unknown as jest.Mocked<CreateVoteHandler>;
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

  let controller: VoteController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VoteController(
      createVoteHandler,
      requestAttachmentUploadHandler,
      confirmAttachmentUploadHandler,
    );
  });

  it('maps POST /votes to create vote command handler', async () => {
    createVoteExecute.mockResolvedValue({
      id: 'vote-1',
      commissionId: 'commission-1',
      status: VoteStatus.Draft,
    });

    const response = await controller.createVote({
      commissionId: 'commission-1',
      title: 'Board election',
      votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
      defaultPolicy: {
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      },
      identityVerificationPolicy: {
        required: false,
      },
    });

    expect(response).toEqual({
      id: 'vote-1',
      commissionId: 'commission-1',
      status: VoteStatus.Draft,
    });
    expect(createVoteExecute).toHaveBeenCalledTimes(1);
    expect(createVoteExecute.mock.calls[0][0]).toMatchObject({
      commissionId: 'commission-1',
      title: 'Board election',
      votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
    });
  });

  it('maps POST /votes/:voteId/attachments/upload-url to request attachment upload handler', async () => {
    requestAttachmentUploadExecute.mockResolvedValue({
      storageKey: 'attachments/vote-key',
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });

    const response = await controller.requestVoteAttachmentUpload(
      { voteId: 'vote-1' },
      {
        attachmentType: 'NOTICE',
        originalName: 'notice.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        sortOrder: 1,
      },
    );

    expect(response).toEqual({
      storageKey: 'attachments/vote-key',
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });
    expect(requestAttachmentUploadExecute).toHaveBeenCalledTimes(1);
    expect(requestAttachmentUploadExecute.mock.calls[0][0]).toMatchObject({
      target: {
        targetType: AttachmentTargetType.Vote,
        voteId: 'vote-1',
      },
      attachmentType: 'NOTICE',
      originalName: 'notice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      sortOrder: 1,
    });
  });

  it('maps POST /votes/:voteId/attachments/confirm to confirm attachment upload handler', async () => {
    confirmAttachmentUploadExecute.mockResolvedValue({
      attachmentId: 'attachment-1',
      fileId: 'file-1',
      storageKey: 'attachments/vote-key',
    });

    const response = await controller.confirmVoteAttachmentUpload(
      { voteId: 'vote-1' },
      {
        storageKey: 'attachments/vote-key',
        attachmentType: 'GUIDE',
        originalName: 'guide.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        checksum: 'sha256:guide',
        sortOrder: 2,
      },
    );

    expect(response).toEqual({
      attachmentId: 'attachment-1',
      fileId: 'file-1',
      storageKey: 'attachments/vote-key',
    });
    expect(confirmAttachmentUploadExecute).toHaveBeenCalledTimes(1);
    expect(confirmAttachmentUploadExecute.mock.calls[0][0]).toMatchObject({
      target: {
        targetType: AttachmentTargetType.Vote,
        voteId: 'vote-1',
      },
      storageKey: 'attachments/vote-key',
      attachmentType: 'GUIDE',
      originalName: 'guide.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      checksum: 'sha256:guide',
      sortOrder: 2,
    });
  });
});
