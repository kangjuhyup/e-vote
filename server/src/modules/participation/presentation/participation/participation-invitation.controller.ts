import {
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { ElectorNotFoundError } from '../../application/command/handler/cast-participation.handler';
import { IssueParticipationInvitationHandler } from '../../application/command/handler/issue-participation-invitation.handler';

@ApiTags('participation-invitations')
@Controller('votes/:voteId/electors/:electorId/participation-invitation')
export class ParticipationInvitationController {
  constructor(
    private readonly issue: IssueParticipationInvitationHandler,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: '선거인 SMS 참여 링크 생성 또는 교체' })
  @ApiCreatedResponse({ description: '원문 링크는 이 응답에서만 제공합니다.' })
  async create(
    @User() user: UserPrincipal,
    @Param('voteId', new ParseUUIDPipe()) voteId: string,
    @Param('electorId', new ParseUUIDPipe()) electorId: string,
  ) {
    try {
      const result = await this.issue.execute(voteId, electorId);
      const baseUrl =
        this.config.get<string>('PARTICIPATION_PUBLIC_URL') ??
        'http://localhost:3001/participate';
      return {
        invitationId: result.invitationId,
        participationUrl: `${baseUrl.replace(/#.*$/, '')}#${result.rawToken}`,
        expiresAt: result.expiresAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ElectorNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
