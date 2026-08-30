import { CastParticipationCommand } from '../../../../src/application/command/dto/request/cast-participation.command';
import {
  CandidateNotFoundError,
  CastParticipationHandler,
} from '../../../../src/application/command/handler/cast-participation.handler';
import { RecordFieldParticipationEvidenceCommand } from '../../../../src/application/command/dto/request/record-field-participation-evidence.command';
import { RecordFieldParticipationEvidenceHandler } from '../../../../src/application/command/handler/record-field-participation-evidence.handler';
import { ParticipationStatus } from '../../../../src/domain/participation/type/participation-status.type';
import { DomainError } from '../../../../src/domain/shared/domain-error';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';
import { ParticipationController } from '../../../../src/presentation/route/participation/participation.controller';

describe('ParticipationController', () => {
  const castParticipationExecute = jest.fn<
    ReturnType<CastParticipationHandler['execute']>,
    [CastParticipationCommand]
  >();
  const recordEvidenceExecute = jest.fn<
    ReturnType<RecordFieldParticipationEvidenceHandler['execute']>,
    [RecordFieldParticipationEvidenceCommand]
  >();
  const castParticipationHandler = {
    execute: castParticipationExecute,
  } as unknown as jest.Mocked<CastParticipationHandler>;
  const recordEvidenceHandler = {
    execute: recordEvidenceExecute,
  } as unknown as jest.Mocked<RecordFieldParticipationEvidenceHandler>;

  let controller: ParticipationController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ParticipationController(
      castParticipationHandler,
      recordEvidenceHandler,
    );
  });

  it('maps POST /participations to cast participation handler', async () => {
    castParticipationExecute.mockResolvedValue({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      status: ParticipationStatus.Cast,
    });

    const response = await controller.castParticipation({
      voteId: 'vote-1',
      voteDetailId: 'detail-1',
      electorId: 'elector-1',
      selectedCandidateId: 'candidate-1',
      votingChannel: VotingChannel.Onsite,
      fieldVotingSessionId: 'session-1',
      participatedAt: '2026-08-20T01:00:00.000Z',
    });

    expect(response).toEqual({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      status: ParticipationStatus.Cast,
    });
    expect(castParticipationExecute).toHaveBeenCalledTimes(1);
    expect(castParticipationExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      voteDetailId: 'detail-1',
      electorId: 'elector-1',
      selectedCandidateId: 'candidate-1',
      votingChannel: 'ONSITE',
      fieldVotingSessionId: 'session-1',
      participatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });
  });

  it('rejects a missing selected candidate as bad request', async () => {
    await expect(
      controller.castParticipation({
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        electorId: 'elector-1',
        selectedCandidateId: '',
        votingChannel: VotingChannel.Online,
        participatedAt: '2026-08-20T01:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(castParticipationExecute).not.toHaveBeenCalled();
  });

  it('maps an invalid candidate to not found', async () => {
    castParticipationExecute.mockRejectedValue(new CandidateNotFoundError());

    await expect(
      controller.castParticipation({
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        electorId: 'elector-1',
        selectedCandidateId: 'missing',
        votingChannel: VotingChannel.Online,
        participatedAt: '2026-08-20T01:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    new DomainError('vote must be open for participation'),
    Object.assign(new Error('duplicate participation'), { code: '23505' }),
  ])('maps a participation conflict to HTTP 409', async (error) => {
    castParticipationExecute.mockRejectedValue(error);

    await expect(
      controller.castParticipation({
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        electorId: 'elector-1',
        selectedCandidateId: 'candidate-1',
        votingChannel: VotingChannel.Online,
        participatedAt: '2026-08-20T01:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps POST /participations/:participationId/field-evidence to evidence handler', async () => {
    recordEvidenceExecute.mockResolvedValue({
      id: 'evidence-1',
      participationId: 'participation-1',
    });

    const response = await controller.recordFieldParticipationEvidence(
      { participationId: 'participation-1' },
      {
        fieldVotingSessionId: 'session-1',
        verifiedByCommissionMemberId: 'member-1',
        evidenceFileId: 'file-1',
        verificationNote: 'signature checked',
        verifiedAt: '2026-08-20T01:10:00.000Z',
      },
    );

    expect(response).toEqual({
      id: 'evidence-1',
      participationId: 'participation-1',
    });
    expect(recordEvidenceExecute).toHaveBeenCalledTimes(1);
    expect(recordEvidenceExecute.mock.calls[0][0]).toMatchObject({
      participationId: 'participation-1',
      fieldVotingSessionId: 'session-1',
      verifiedByCommissionMemberId: 'member-1',
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
      verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
    });
  });
});
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
