import {
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { GetDevelopmentParticipationLinkQuery } from '../../application/query/dto/request/get-development-participation-link.query';
import {
  DevelopmentParticipationLinkAccessDeniedError,
  DevelopmentParticipationLinkMismatchError,
  DevelopmentParticipationLinkNotFoundError,
  DevelopmentParticipationLinkVoteNotFoundError,
} from '../../application/query/development-participation-link.error';
import { GetDevelopmentParticipationLinkHandler } from '../../application/query/handler/get-development-participation-link.handler';
import { ParticipationAccessNotConfiguredError } from '../../application/port/security/participation-access-token.port';
import {
  DevelopmentParticipationLinkParam,
  DevelopmentParticipationLinkResponse,
} from './dto/development-participation-link.dto';

@ApiTags('development-participation-links')
@Controller('votes/:voteId/electors/:electorId')
export class DevelopmentParticipationLinkController {
  constructor(
    private readonly getDevelopmentParticipationLinkHandler: GetDevelopmentParticipationLinkHandler,
  ) {}

  @Get('development-participation-link')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: '개발용 현재 선거인 참여 링크 조회',
    description:
      'development 및 test 환경에서만 등록됩니다. 투표 생성자에게만 현재 참여 링크를 반환합니다.',
  })
  @ApiOkResponse({ type: DevelopmentParticipationLinkResponse })
  @ApiForbiddenResponse({
    description: '현재 사용자가 투표 생성자가 아닙니다.',
  })
  @ApiNotFoundResponse({
    description: '투표 또는 현재 사용 가능한 참여 초대가 없습니다.',
  })
  @ApiConflictResponse({ description: '참여 링크를 재발급해야 합니다.' })
  @ApiServiceUnavailableResponse({
    description: '참여 링크 서명 설정이 없습니다.',
  })
  async getCurrentLink(
    @User() user: UserPrincipal,
    @Param() params: DevelopmentParticipationLinkParam,
  ): Promise<DevelopmentParticipationLinkResponse> {
    try {
      return DevelopmentParticipationLinkResponse.of(
        await this.getDevelopmentParticipationLinkHandler.execute(
          GetDevelopmentParticipationLinkQuery.of({
            voteId: params.voteId,
            electorId: params.electorId,
            requestedByUserPrincipalId: user.id,
          }),
        ),
      );
    } catch (error) {
      if (
        error instanceof DevelopmentParticipationLinkVoteNotFoundError ||
        error instanceof DevelopmentParticipationLinkNotFoundError
      ) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof DevelopmentParticipationLinkAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof DevelopmentParticipationLinkMismatchError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof ParticipationAccessNotConfiguredError) {
        throw new ServiceUnavailableException(
          'participation access signing is not configured',
        );
      }
      throw error;
    }
  }
}
