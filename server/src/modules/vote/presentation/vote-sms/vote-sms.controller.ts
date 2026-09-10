import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { VoteOrganizationProtected } from '../../../../shared/presentation/common/decorator/vote-organization-protected.decorator';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { throwMappedSmsSenderError } from '../../../../shared/presentation/common/mapper/sms-sender-error.mapper';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SendVoteSmsCommand } from '../../application/command/dto/request/send-vote-sms.command';
import {
  SendVoteSmsHandler,
  VoteSmsAccessDeniedError,
} from '../../application/command/handler/send-vote-sms.handler';
import {
  SmsMessagePurpose,
  type VoteSmsMessagePurpose,
} from '../../../../shared/domain/voting/type/sms-message-purpose.type';
import { VoteParam } from '../vote/dto/create-vote-request.dto';
import { SendVoteSmsBody } from './dto/send-vote-sms-request.dto';
import { SendVoteSmsResponse } from './dto/send-vote-sms-response.dto';
import { GetParticipationReminderTemplateQuery } from '../../application/query/dto/request/get-participation-reminder-template.query';
import { GetParticipationReminderTemplateHandler } from '../../application/query/handler/get-participation-reminder-template.handler';
import { GetParticipationReminderTemplateResponse } from './dto/get-participation-reminder-template-response.dto';

@ApiTags('vote-sms')
@Controller('votes/:voteId/sms')
@VoteOrganizationProtected()
export class VoteSmsController {
  constructor(
    private readonly sendVoteSmsHandler: SendVoteSmsHandler,
    private readonly getParticipationReminderTemplateHandler: GetParticipationReminderTemplateHandler,
  ) {}

  @Get('participation-reminder/template')
  @VoteOrganizationProtected('read')
  @ApiOperation({ summary: '투표 참여 독려 발송 템플릿 조회' })
  @ApiOkResponse({ type: GetParticipationReminderTemplateResponse })
  getParticipationReminderTemplate(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
  ): GetParticipationReminderTemplateResponse {
    return GetParticipationReminderTemplateResponse.of(
      this.getParticipationReminderTemplateHandler.execute(
        GetParticipationReminderTemplateQuery.of({ voteId: params.voteId }),
      ),
    );
  }

  @Post('participation-reminder')
  @HttpCode(202)
  @ApiOperation({ summary: '미투표자 투표 참여 독려 문자 발송' })
  @ApiAcceptedResponse({ type: SendVoteSmsResponse })
  @ApiForbiddenResponse({
    description: '현재 사용자가 투표 생성자가 아닙니다.',
  })
  sendParticipationReminder(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
  ): Promise<SendVoteSmsResponse> {
    return this.send(
      user.id,
      params.voteId,
      SmsMessagePurpose.VoteParticipationReminder,
    );
  }

  @Post('result-notice')
  @HttpCode(202)
  @ApiOperation({ summary: '투표 결과 안내 문자 발송' })
  @ApiBody({ type: SendVoteSmsBody })
  @ApiAcceptedResponse({ type: SendVoteSmsResponse })
  sendResultNotice(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
    @Body() body: SendVoteSmsBody,
  ): Promise<SendVoteSmsResponse> {
    return this.send(
      user.id,
      params.voteId,
      SmsMessagePurpose.VoteResultNotice,
      body.message,
    );
  }

  @Post('upcoming-notice')
  @HttpCode(202)
  @ApiOperation({ summary: '투표 예정 안내 문자 발송' })
  @ApiBody({ type: SendVoteSmsBody })
  @ApiAcceptedResponse({ type: SendVoteSmsResponse })
  sendUpcomingVoteNotice(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
    @Body() body: SendVoteSmsBody,
  ): Promise<SendVoteSmsResponse> {
    return this.send(
      user.id,
      params.voteId,
      SmsMessagePurpose.UpcomingVoteNotice,
      body.message,
    );
  }

  private async send(
    requestedByUserPrincipalId: string,
    voteId: string,
    purpose: VoteSmsMessagePurpose,
    message?: string,
  ): Promise<SendVoteSmsResponse> {
    try {
      return SendVoteSmsResponse.of(
        await this.sendVoteSmsHandler.execute(
          SendVoteSmsCommand.of({
            voteId,
            requestedByUserPrincipalId,
            purpose,
            message,
          }),
        ),
      );
    } catch (error) {
      if (error instanceof VoteSmsAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      throwMappedSmsSenderError(error);
    }
  }
}
