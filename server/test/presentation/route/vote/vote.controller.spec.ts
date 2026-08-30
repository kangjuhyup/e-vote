import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';
import { NotFoundException } from '@nestjs/common';
import { ConfirmAttachmentUploadCommand } from '../../../../src/modules/vote/application/command/dto/request/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadHandler } from '../../../../src/modules/vote/application/command/handler/confirm-attachment-upload.handler';
import { CreateVoteCommand } from '../../../../src/modules/vote/application/command/dto/request/create-vote.command';
import { CreateVoteHandler } from '../../../../src/modules/vote/application/command/handler/create-vote.handler';
import { RequestAttachmentUploadCommand } from '../../../../src/modules/vote/application/command/dto/request/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../../src/modules/vote/application/command/handler/request-attachment-upload.handler';
import { AttachmentTargetType } from '../../../../src/modules/vote/application/port/persistence/command/attachment-repository.port';
import { GetVotePageHandler } from '../../../../src/modules/vote/application/query/handler/get-vote-page.handler';
import { GetVotePageQuery } from '../../../../src/modules/vote/application/query/dto/request/get-vote-page.query';
import {
  GetVoteHandler,
  VoteNotFoundError,
} from '../../../../src/modules/vote/application/query/handler/get-vote.handler';
import { GetVoteQuery } from '../../../../src/modules/vote/application/query/dto/request/get-vote.query';
import {
  CandidateView,
  IdentityVerificationPolicyView,
  VoteDetailView,
  VotePageView,
  VotePolicyOverridesView,
  VotePolicyView,
  VoteSummaryView,
  VoteView,
} from '../../../../src/modules/vote/application/query/dto/response/vote.view';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { VoteAttachmentController } from '../../../../src/modules/vote/presentation/vote/vote-attachment.controller';
import { VoteReadController } from '../../../../src/modules/vote/presentation/vote/vote-read.controller';
import { VoteController } from '../../../../src/modules/vote/presentation/vote/vote.controller';

describe('VoteController', () => {
  const createVoteExecute = jest.fn<
    ReturnType<CreateVoteHandler['execute']>,
    [CreateVoteCommand]
  >();
  const createVoteHandler = {
    execute: createVoteExecute,
  } as unknown as jest.Mocked<CreateVoteHandler>;
  const getVoteExecute = jest.fn<
    ReturnType<GetVoteHandler['execute']>,
    [GetVoteQuery]
  >();
  const getVoteHandler = {
    execute: getVoteExecute,
  } as unknown as jest.Mocked<GetVoteHandler>;
  const getVotePageExecute = jest.fn<
    ReturnType<GetVotePageHandler['execute']>,
    [GetVotePageQuery]
  >();
  const getVotePageHandler = {
    execute: getVotePageExecute,
  } as unknown as jest.Mocked<GetVotePageHandler>;
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
  let readController: VoteReadController;
  let attachmentController: VoteAttachmentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VoteController(createVoteHandler);
    readController = new VoteReadController(getVoteHandler, getVotePageHandler);
    attachmentController = new VoteAttachmentController(
      requestAttachmentUploadHandler,
      confirmAttachmentUploadHandler,
    );
  });

  it('maps GET /votes to vote page query handler', async () => {
    getVotePageExecute.mockResolvedValue(createVotePageView());

    const response = await readController.getVotePage(TEST_USER_PRINCIPAL, {
      page: '2',
      pageSize: '10',
    });

    expect(response).toEqual({
      items: [
        {
          id: 'vote-1',
          commissionId: 'commission-1',
          title: 'Board election',
          votingChannels: [VotingChannel.Online],
          defaultPolicy: {
            privacyMode: PrivacyMode.Secret,
            participationUnit: ParticipationUnit.Individual,
            resultStorageMode: ResultStorageMode.Database,
            voteWeightMode: VoteWeightMode.Equal,
          },
          identityVerificationPolicy: {
            required: false,
          },
          status: VoteStatus.Draft,
          startedAt: '2026-08-13T00:00:00.000Z',
          endedAt: '2026-08-14T00:00:00.000Z',
          createdAt: '2026-08-12T00:00:00.000Z',
          updatedAt: '2026-08-12T01:00:00.000Z',
        },
      ],
      page: 2,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    expect(getVotePageExecute).toHaveBeenCalledTimes(1);
    expect(getVotePageExecute.mock.calls[0][0]).toMatchObject({
      page: 2,
      pageSize: 10,
    });
  });

  it('maps GET /votes/:voteId to vote detail query handler', async () => {
    getVoteExecute.mockResolvedValue(createVoteView());

    const response = await readController.getVote(TEST_USER_PRINCIPAL, {
      voteId: 'vote-1',
    });

    expect(response).toEqual({
      id: 'vote-1',
      commissionId: 'commission-1',
      title: 'Board election',
      description: 'Annual board election',
      votingChannels: [VotingChannel.Online],
      defaultPolicy: {
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      },
      identityVerificationPolicy: {
        required: false,
      },
      status: VoteStatus.Draft,
      voteDetails: [
        {
          id: 'vote-detail-1',
          voteId: 'vote-1',
          title: 'President',
          description: '',
          type: 'CANDIDATE',
          overrides: {
            privacyMode: PrivacyMode.Public,
          },
          sortOrder: 0,
          status: VoteStatus.Draft,
          candidates: [
            {
              id: 'candidate-1',
              voteDetailId: 'vote-detail-1',
              candidateNo: 1,
              name: 'Kim',
              description: '',
              status: 'ACTIVE',
              createdAt: '2026-08-12T00:00:00.000Z',
              updatedAt: '2026-08-12T01:00:00.000Z',
            },
          ],
          createdAt: '2026-08-12T00:00:00.000Z',
          updatedAt: '2026-08-12T01:00:00.000Z',
        },
      ],
      startedAt: '2026-08-13T00:00:00.000Z',
      endedAt: '2026-08-14T00:00:00.000Z',
      createdAt: '2026-08-12T00:00:00.000Z',
      updatedAt: '2026-08-12T01:00:00.000Z',
    });
    expect(getVoteExecute).toHaveBeenCalledTimes(1);
    expect(getVoteExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
    });
  });

  it('maps missing vote detail to 404', async () => {
    getVoteExecute.mockRejectedValue(new VoteNotFoundError());

    await expect(
      readController.getVote(TEST_USER_PRINCIPAL, { voteId: 'missing-vote' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps POST /votes to create vote command handler', async () => {
    createVoteExecute.mockResolvedValue({
      id: 'vote-1',
      commissionId: 'commission-1',
      status: VoteStatus.Draft,
    });

    const response = await controller.createVote(TEST_USER_PRINCIPAL, {
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

    const response = await attachmentController.requestVoteAttachmentUpload(
      TEST_USER_PRINCIPAL,
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

    const response = await attachmentController.confirmVoteAttachmentUpload(
      TEST_USER_PRINCIPAL,
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

function createVoteView(): VoteView {
  return VoteView.of({
    ...createVoteSummaryProps(),
    description: 'Annual board election',
    voteDetails: [
      VoteDetailView.of({
        id: 'vote-detail-1',
        voteId: 'vote-1',
        title: 'President',
        description: '',
        type: 'CANDIDATE',
        overrides: VotePolicyOverridesView.of({
          privacyMode: PrivacyMode.Public,
        }),
        sortOrder: 0,
        status: VoteStatus.Draft,
        candidates: [
          CandidateView.of({
            id: 'candidate-1',
            voteDetailId: 'vote-detail-1',
            candidateNo: 1,
            name: 'Kim',
            description: '',
            status: 'ACTIVE',
            createdAt: new Date('2026-08-12T00:00:00.000Z'),
            updatedAt: new Date('2026-08-12T01:00:00.000Z'),
          }),
        ],
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        updatedAt: new Date('2026-08-12T01:00:00.000Z'),
      }),
    ],
  });
}

function createVotePageView(): VotePageView {
  return VotePageView.of({
    items: [VoteSummaryView.of(createVoteSummaryProps())],
    page: 2,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
  });
}

function createVoteSummaryProps(): Parameters<typeof VoteSummaryView.of>[0] {
  return {
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Board election',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: VotePolicyView.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicyView.of({
      required: false,
    }),
    status: VoteStatus.Draft,
    startedAt: new Date('2026-08-13T00:00:00.000Z'),
    endedAt: new Date('2026-08-14T00:00:00.000Z'),
    createdAt: new Date('2026-08-12T00:00:00.000Z'),
    updatedAt: new Date('2026-08-12T01:00:00.000Z'),
  };
}
