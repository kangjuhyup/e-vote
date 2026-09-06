import { ElectorParticipantForbiddenError } from '../../../../shared/application/port/capability/elector-participant-access.port';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import {
  BadRequestException,
  Body,
  ConflictException,
  ForbiddenException,
  Controller,
  NotFoundException,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CastParticipationCommand } from '../../application/command/dto/request/cast-participation.command';
import {
  CandidateNotFoundError,
  CastParticipationHandler,
  ElectorNotFoundError,
  FieldVotingSessionNotFoundError,
  ParticipationSignatureRequiredError,
  VoteDetailNotFoundError,
  VoteNotFoundError,
} from '../../application/command/handler/cast-participation.handler';
import { DomainError } from '../../../../shared/domain/domain-error';
import { CastParticipationBody } from './dto/cast-participation-request.dto';
import { CastParticipationResponse } from './dto/cast-participation-response.dto';

@ApiTags('participations')
@Controller('participations')
export class ParticipationController {
  constructor(
    private readonly castParticipationHandler: CastParticipationHandler,
  ) {}

  @Post()
  @ApiOperation({
    summary: '투표 참여 기록',
    description: '온라인, 현장, 방문 채널의 투표 참여를 기록합니다.',
  })
  @ApiBody({
    type: CastParticipationBody,
    description: '투표 참여 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CastParticipationResponse,
    description: '투표 참여 기록 결과입니다.',
  })
  @ApiBadRequestResponse({
    description: '선택 후보 ID 등 필수 참여 정보가 누락됐습니다.',
  })
  @ApiNotFoundResponse({
    description: '투표, 자식 투표, 선거인, 후보 또는 현장 세션이 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '투표 상태, 채널, 자격 또는 중복 참여 조건을 충족하지 않습니다.',
  })
  async castParticipation(
    @User() user: UserPrincipal,
    @Body() body: CastParticipationBody,
  ): Promise<CastParticipationResponse> {
    if (!body.selectedCandidateId?.trim()) {
      throw new BadRequestException('selected candidate is required');
    }

    try {
      const result = await this.castParticipationHandler.execute(
        CastParticipationCommand.of({
          userPrincipalId: user.id,
          voteId: body.voteId,
          voteDetailId: body.voteDetailId,
          electorId: body.electorId,
          selectedCandidateId: body.selectedCandidateId,
          votingChannel: body.votingChannel,
          fieldVotingSessionId: body.fieldVotingSessionId,
          participatedAt: new Date(),
        }),
      );

      return CastParticipationResponse.of(result);
    } catch (error) {
      throwParticipationHttpError(error);
    }
  }
}

function throwParticipationHttpError(error: unknown): never {
  if (error instanceof ElectorParticipantForbiddenError)
    throw new ForbiddenException(error.message);
  if (
    error instanceof VoteNotFoundError ||
    error instanceof VoteDetailNotFoundError ||
    error instanceof ElectorNotFoundError ||
    error instanceof CandidateNotFoundError ||
    error instanceof FieldVotingSessionNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof ParticipationSignatureRequiredError ||
    error instanceof DomainError ||
    isUniqueConstraintError(error)
  ) {
    throw new ConflictException(
      error instanceof Error ? error.message : 'participation already exists',
    );
  }

  throw error;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    readonly code?: unknown;
    readonly name?: unknown;
  };

  return (
    candidate.code === '23505' ||
    candidate.name === 'UniqueConstraintViolationException'
  );
}
