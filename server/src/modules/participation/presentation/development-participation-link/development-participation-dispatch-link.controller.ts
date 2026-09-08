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
import { GetDevelopmentParticipationDispatchLinkQuery } from '../../application/query/dto/request/get-development-participation-dispatch-link.query';
import {
  DevelopmentParticipationDispatchLinkNotFoundError,
  DevelopmentParticipationDispatchLinkStaleError,
  DevelopmentParticipationLinkAccessDeniedError,
  DevelopmentParticipationLinkMismatchError,
  DevelopmentParticipationLinkVoteNotFoundError,
} from '../../application/query/development-participation-link.error';
import { GetDevelopmentParticipationDispatchLinkHandler } from '../../application/query/handler/get-development-participation-dispatch-link.handler';
import { ParticipationAccessNotConfiguredError } from '../../application/port/security/participation-access-token.port';
import {
  DevelopmentParticipationDispatchLinkParam,
  DevelopmentParticipationLinkResponse,
} from './dto/development-participation-link.dto';

@ApiTags('development-participation-links')
@Controller('votes/:voteId/sms/dispatches/:smsDispatchId/electors/:electorId')
export class DevelopmentParticipationDispatchLinkController {
  constructor(
    private readonly handler: GetDevelopmentParticipationDispatchLinkHandler,
  ) {}

  @Get('development-participation-link')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: '개발용 문자 발송 건별 참여 링크 조회',
    description:
      'development 및 test 환경에서만 등록됩니다. 해당 발송 건의 참여 링크가 아직 현재 세대일 때만 투표 생성자에게 반환합니다.',
  })
  @ApiOkResponse({ type: DevelopmentParticipationLinkResponse })
  @ApiForbiddenResponse({
    description: '현재 사용자가 투표 생성자가 아닙니다.',
  })
  @ApiNotFoundResponse({
    description: '투표 또는 해당 참여 독려 발송 수신자를 찾을 수 없습니다.',
  })
  @ApiConflictResponse({
    description:
      '해당 발송 건의 참여 링크가 재발급되어 더 이상 유효하지 않습니다.',
  })
  @ApiServiceUnavailableResponse({
    description: '참여 링크 서명 설정이 없습니다.',
  })
  async getDispatchLink(
    @User() user: UserPrincipal,
    @Param() params: DevelopmentParticipationDispatchLinkParam,
  ): Promise<DevelopmentParticipationLinkResponse> {
    try {
      return DevelopmentParticipationLinkResponse.of(
        await this.handler.execute(
          GetDevelopmentParticipationDispatchLinkQuery.of({
            voteId: params.voteId,
            smsDispatchId: params.smsDispatchId,
            electorId: params.electorId,
            requestedByUserPrincipalId: user.id,
          }),
        ),
      );
    } catch (error) {
      if (
        error instanceof DevelopmentParticipationLinkVoteNotFoundError ||
        error instanceof DevelopmentParticipationDispatchLinkNotFoundError
      ) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof DevelopmentParticipationLinkAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      if (
        error instanceof DevelopmentParticipationDispatchLinkStaleError ||
        error instanceof DevelopmentParticipationLinkMismatchError
      ) {
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
