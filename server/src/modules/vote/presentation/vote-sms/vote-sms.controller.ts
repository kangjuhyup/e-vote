import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { throwMappedSmsSenderError } from '../../../../shared/presentation/common/mapper/sms-sender-error.mapper';
import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SendVoteSmsCommand } from '../../application/command/dto/request/send-vote-sms.command';
import { SendVoteSmsHandler } from '../../application/command/handler/send-vote-sms.handler';
import {
  SmsMessagePurpose,
  type VoteSmsMessagePurpose,
} from '../../../../shared/domain/voting/type/sms-message-purpose.type';
import { VoteParam } from '../vote/dto/create-vote-request.dto';
import { SendVoteSmsBody } from './dto/send-vote-sms-request.dto';
import { SendVoteSmsResponse } from './dto/send-vote-sms-response.dto';

@ApiTags('vote-sms')
@Controller('votes/:voteId/sms')
export class VoteSmsController {
  constructor(private readonly sendVoteSmsHandler: SendVoteSmsHandler) {}

  @Post('participation-reminder')
  @HttpCode(202)
  @ApiOperation({ summary: '미투표자 투표 참여 독려 문자 발송' })
  @ApiBody({ type: SendVoteSmsBody })
  @ApiAcceptedResponse({ type: SendVoteSmsResponse })
  sendParticipationReminder(
    @User() user: UserPrincipal,
    @Param() params: VoteParam,
    @Body() body: SendVoteSmsBody,
  ): Promise<SendVoteSmsResponse> {
    return this.send(
      params.voteId,
      SmsMessagePurpose.VoteParticipationReminder,
      body.message,
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
      params.voteId,
      SmsMessagePurpose.UpcomingVoteNotice,
      body.message,
    );
  }

  private async send(
    voteId: string,
    purpose: VoteSmsMessagePurpose,
    message: string,
  ): Promise<SendVoteSmsResponse> {
    try {
      return SendVoteSmsResponse.of(
        await this.sendVoteSmsHandler.execute(
          SendVoteSmsCommand.of({ voteId, purpose, message }),
        ),
      );
    } catch (error) {
      throwMappedSmsSenderError(error);
    }
  }
}
