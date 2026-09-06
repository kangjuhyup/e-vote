import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CastParticipationCommand } from '../../../../src/modules/participation/application/command/dto/request/cast-participation.command';
import {
  CandidateNotFoundError,
  CastParticipationHandler,
  ParticipationSignatureRequiredError,
} from '../../../../src/modules/participation/application/command/handler/cast-participation.handler';
import { ParticipationStatus } from '../../../../src/shared/domain/voting/type/participation-status.type';
import { DomainError } from '../../../../src/shared/domain/domain-error';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { ParticipationController } from '../../../../src/modules/participation/presentation/participation/participation.controller';

describe('ParticipationController', () => {
  const castParticipationExecute = jest.fn<
    ReturnType<CastParticipationHandler['execute']>,
    [CastParticipationCommand]
  >();
  const castParticipationHandler = {
    execute: castParticipationExecute,
  } as unknown as jest.Mocked<CastParticipationHandler>;

  let controller: ParticipationController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ParticipationController(castParticipationHandler);
  });

  it('maps POST /participations to cast participation handler', async () => {
    castParticipationExecute.mockResolvedValue({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      status: ParticipationStatus.Cast,
    });

    const response = await controller.castParticipation(TEST_USER_PRINCIPAL, {
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
      participatedAt: expect.any(Date) as Date,
      userPrincipalId: TEST_USER_PRINCIPAL.id,
    });
  });

  it('rejects a missing selected candidate as bad request', async () => {
    await expect(
      controller.castParticipation(TEST_USER_PRINCIPAL, {
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
      controller.castParticipation(TEST_USER_PRINCIPAL, {
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
    new ParticipationSignatureRequiredError(),
    new DomainError('vote must be open for participation'),
    Object.assign(new Error('duplicate participation'), { code: '23505' }),
  ])('maps a participation conflict to HTTP 409', async (error) => {
    castParticipationExecute.mockRejectedValue(error);

    await expect(
      controller.castParticipation(TEST_USER_PRINCIPAL, {
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        electorId: 'elector-1',
        selectedCandidateId: 'candidate-1',
        votingChannel: VotingChannel.Online,
        participatedAt: '2026-08-20T01:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
