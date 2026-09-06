import {
  Body,
  ConflictException,
  Controller,
  Get,
  GoneException,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CastParticipationWithInvitationHandler } from '../modules/participation/application/command/handler/cast-participation-with-invitation.handler';
import {
  CandidateNotFoundError,
  ElectorNotFoundError,
  VoteDetailNotFoundError,
  VoteNotFoundError,
} from '../modules/participation/application/command/handler/cast-participation.handler';
import { ParticipationInvitationNotFoundError } from '../modules/participation/application/participation-invitation.resolver';
import { GetParticipationAccessHandler } from '../modules/participation/application/query/handler/get-participation-access.handler';
import { ParticipationInvitationUnavailableError } from '../modules/participation/domain/participation-invitation.aggregate';
import { CastParticipationResponse } from '../modules/participation/presentation/participation/dto/cast-participation-response.dto';
import { CastParticipationWithInvitationBody } from '../modules/participation/presentation/participation/dto/participation-access-request.dto';
import { DomainError } from '../shared/domain/domain-error';
import { Public } from '../shared/presentation/common/decorator/public.decorator';

const TOKEN_HEADER = 'x-participation-token';

@Public()
@ApiTags('participation-access')
@ApiHeader({ name: 'X-Participation-Token', required: true })
@Controller('participation-access')
export class ParticipationAccessController {
  constructor(
    private readonly getAccess: GetParticipationAccessHandler,
    private readonly cast: CastParticipationWithInvitationHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: '참여 링크로 선거인용 투표 정보 조회' })
  @ApiOkResponse({ description: '링크에 결합된 투표와 투표 항목입니다.' })
  async get(@Headers(TOKEN_HEADER) token?: string) {
    try {
      return await this.getAccess.execute(token ?? '');
    } catch (error) {
      throwParticipationAccessError(error);
    }
  }

  @Post('participations')
  @HttpCode(201)
  @ApiOperation({ summary: '참여 링크로 온라인 투표 기록' })
  @ApiCreatedResponse({ type: CastParticipationResponse })
  async create(
    @Headers(TOKEN_HEADER) token: string | undefined,
    @Body() body: CastParticipationWithInvitationBody,
  ) {
    try {
      return CastParticipationResponse.of(
        await this.cast.execute(
          token ?? '',
          body.voteDetailId,
          body.selectedCandidateId,
        ),
      );
    } catch (error) {
      throwParticipationAccessError(error);
    }
  }
}

function throwParticipationAccessError(error: unknown): never {
  if (error instanceof ParticipationInvitationNotFoundError) {
    throw new NotFoundException('participation invitation not found');
  }
  if (error instanceof ParticipationInvitationUnavailableError) {
    throw new GoneException(error.message);
  }
  if (
    error instanceof VoteNotFoundError ||
    error instanceof VoteDetailNotFoundError ||
    error instanceof ElectorNotFoundError ||
    error instanceof CandidateNotFoundError
  ) {
    throw new NotFoundException(error.message);
  }
  if (error instanceof DomainError || isUniqueConstraintError(error)) {
    throw new ConflictException(
      error instanceof Error ? error.message : 'participation already exists',
    );
  }
  throw error;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; name?: unknown };
  return (
    candidate.code === '23505' ||
    candidate.name === 'UniqueConstraintViolationException'
  );
}
