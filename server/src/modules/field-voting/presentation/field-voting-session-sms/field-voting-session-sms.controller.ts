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
import { SendFieldVotingSessionSmsCommand } from '../../application/command/dto/request/send-field-voting-session-sms.command';
import { SendFieldVotingSessionSmsHandler } from '../../application/command/handler/send-field-voting-session-sms.handler';
import {
  SendFieldVotingSessionSmsBody,
  SendFieldVotingSessionSmsParam,
} from './dto/send-field-voting-session-sms-request.dto';
import { SendFieldVotingSessionSmsResponse } from './dto/send-field-voting-session-sms-response.dto';

@ApiTags('field-voting-session-sms')
@Controller('field-voting-sessions/:fieldVotingSessionId/sms')
export class FieldVotingSessionSmsController {
  constructor(
    private readonly sendFieldVotingSessionSmsHandler: SendFieldVotingSessionSmsHandler,
  ) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({ summary: '현장·방문 투표 세션 안내 문자 발송' })
  @ApiBody({ type: SendFieldVotingSessionSmsBody })
  @ApiAcceptedResponse({ type: SendFieldVotingSessionSmsResponse })
  async sendFieldVotingSessionNotice(
    @User() user: UserPrincipal,
    @Param() params: SendFieldVotingSessionSmsParam,
    @Body() body: SendFieldVotingSessionSmsBody,
  ): Promise<SendFieldVotingSessionSmsResponse> {
    try {
      return SendFieldVotingSessionSmsResponse.of(
        await this.sendFieldVotingSessionSmsHandler.execute(
          SendFieldVotingSessionSmsCommand.of({
            fieldVotingSessionId: params.fieldVotingSessionId,
            message: body.message,
          }),
        ),
      );
    } catch (error) {
      throwMappedSmsSenderError(error);
    }
  }
}
