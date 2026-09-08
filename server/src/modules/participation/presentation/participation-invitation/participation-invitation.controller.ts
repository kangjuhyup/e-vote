import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { VoteOrganizationProtected } from '../../../../shared/presentation/common/decorator/vote-organization-protected.decorator';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { DispatchParticipationInvitationsCommand } from '../../application/command/dto/request/dispatch-participation-invitations.command';
import { DispatchParticipationInvitationsHandler } from '../../application/command/handler/dispatch-participation-invitations.handler';
import {
  DispatchParticipationInvitationsBody,
  DispatchParticipationInvitationsResponse,
  ParticipationInvitationElectorParam,
  ParticipationInvitationVoteParam,
} from './dto/participation-invitation.dto';

@ApiTags('participation-invitations')
@Controller('votes/:voteId')
@VoteOrganizationProtected()
export class ParticipationInvitationController {
  constructor(
    private readonly dispatchHandler: DispatchParticipationInvitationsHandler,
  ) {}

  @Post('participation-invitation-dispatches')
  @ApiOperation({ summary: '선거인별 SMS 참여 링크 발송 예약' })
  @ApiCreatedResponse({ type: DispatchParticipationInvitationsResponse })
  async dispatch(
    @User() user: UserPrincipal,
    @Param() params: ParticipationInvitationVoteParam,
    @Body() body: DispatchParticipationInvitationsBody,
  ): Promise<DispatchParticipationInvitationsResponse> {
    return DispatchParticipationInvitationsResponse.of(
      await this.dispatchHandler.execute(
        DispatchParticipationInvitationsCommand.of({
          voteId: params.voteId,
          requestedByUserPrincipalId: user.id,
          electorIds: body.electorIds,
        }),
      ),
    );
  }

  @Post('electors/:electorId/participation-invitation/reissue')
  @ApiOperation({ summary: '선거인 SMS 참여 링크 폐기 및 재발급 예약' })
  @ApiCreatedResponse({ type: DispatchParticipationInvitationsResponse })
  async reissue(
    @User() user: UserPrincipal,
    @Param() params: ParticipationInvitationElectorParam,
  ): Promise<DispatchParticipationInvitationsResponse> {
    return this.dispatch(user, params, { electorIds: [params.electorId] });
  }
}
