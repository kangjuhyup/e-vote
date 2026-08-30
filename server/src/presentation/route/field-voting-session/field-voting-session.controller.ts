import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CancelFieldVotingSessionCommand } from '../../../application/command/dto/request/cancel-field-voting-session.command';
import { CancelFieldVotingSessionHandler } from '../../../application/command/handler/cancel-field-voting-session.handler';
import { CloseFieldVotingSessionCommand } from '../../../application/command/dto/request/close-field-voting-session.command';
import { CloseFieldVotingSessionHandler } from '../../../application/command/handler/close-field-voting-session.handler';
import { CreateFieldVotingSessionCommand } from '../../../application/command/dto/request/create-field-voting-session.command';
import { CreateFieldVotingSessionHandler } from '../../../application/command/handler/create-field-voting-session.handler';
import { OpenFieldVotingSessionCommand } from '../../../application/command/dto/request/open-field-voting-session.command';
import { OpenFieldVotingSessionHandler } from '../../../application/command/handler/open-field-voting-session.handler';
import {
  ChangeFieldVotingSessionStatusBody,
  ChangeFieldVotingSessionStatusParam,
} from './dto/change-field-voting-session-status-request.dto';
import { ChangeFieldVotingSessionStatusResponse } from './dto/change-field-voting-session-status-response.dto';
import {
  CreateFieldVotingSessionBody,
  CreateFieldVotingSessionParam,
} from './dto/create-field-voting-session-request.dto';
import { CreateFieldVotingSessionResponse } from './dto/create-field-voting-session-response.dto';

@ApiTags('field-voting-sessions')
@Controller()
export class FieldVotingSessionController {
  constructor(
    private readonly createFieldVotingSessionHandler: CreateFieldVotingSessionHandler,
    private readonly openFieldVotingSessionHandler: OpenFieldVotingSessionHandler,
    private readonly closeFieldVotingSessionHandler: CloseFieldVotingSessionHandler,
    private readonly cancelFieldVotingSessionHandler: CancelFieldVotingSessionHandler,
  ) {}

  @Post('votes/:voteId/field-voting-sessions')
  @ApiOperation({
    summary: '현장 투표 세션 생성',
    description: '부모 투표에 현장 또는 방문 투표 세션을 생성합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '현장 투표 세션을 만들 부모 투표 ID입니다.',
  })
  @ApiBody({
    type: CreateFieldVotingSessionBody,
    description: '생성할 현장 투표 세션 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CreateFieldVotingSessionResponse,
    description: '현장 투표 세션 생성 결과입니다.',
  })
  async createFieldVotingSession(
    @Param() params: CreateFieldVotingSessionParam,
    @Body() body: CreateFieldVotingSessionBody,
  ): Promise<CreateFieldVotingSessionResponse> {
    const result = await this.createFieldVotingSessionHandler.execute(
      CreateFieldVotingSessionCommand.of({
        commissionId: body.commissionId,
        voteId: params.voteId,
        channel: body.channel,
        title: body.title,
        locationName: body.locationName,
        address: body.address,
        managerIds: body.managerIds,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        scheduledAt: new Date(),
      }),
    );

    return CreateFieldVotingSessionResponse.of(result);
  }

  @Post('field-voting-sessions/:fieldVotingSessionId/open')
  @HttpCode(200)
  @ApiOperation({
    summary: '현장 투표 세션 개시',
    description: '예약된 현장 투표 세션을 개시합니다.',
  })
  @ApiParam({
    name: 'fieldVotingSessionId',
    example: 'session-1',
    description: '개시할 현장 투표 세션 ID입니다.',
  })
  @ApiBody({
    type: ChangeFieldVotingSessionStatusBody,
    description: '현장 투표 세션 개시 정보입니다.',
  })
  @ApiOkResponse({
    type: ChangeFieldVotingSessionStatusResponse,
    description: '현장 투표 세션 상태 변경 결과입니다.',
  })
  async openFieldVotingSession(
    @Param() params: ChangeFieldVotingSessionStatusParam,
    @Body() body: ChangeFieldVotingSessionStatusBody,
  ): Promise<ChangeFieldVotingSessionStatusResponse> {
    const result = await this.openFieldVotingSessionHandler.execute(
      OpenFieldVotingSessionCommand.of({
        fieldVotingSessionId: params.fieldVotingSessionId,
        openedAt: new Date(body.changedAt),
      }),
    );

    return ChangeFieldVotingSessionStatusResponse.of(result);
  }

  @Post('field-voting-sessions/:fieldVotingSessionId/close')
  @HttpCode(200)
  @ApiOperation({
    summary: '현장 투표 세션 종료',
    description: '개시된 현장 투표 세션을 종료합니다.',
  })
  @ApiParam({
    name: 'fieldVotingSessionId',
    example: 'session-1',
    description: '종료할 현장 투표 세션 ID입니다.',
  })
  @ApiBody({
    type: ChangeFieldVotingSessionStatusBody,
    description: '현장 투표 세션 종료 정보입니다.',
  })
  @ApiOkResponse({
    type: ChangeFieldVotingSessionStatusResponse,
    description: '현장 투표 세션 상태 변경 결과입니다.',
  })
  async closeFieldVotingSession(
    @Param() params: ChangeFieldVotingSessionStatusParam,
    @Body() body: ChangeFieldVotingSessionStatusBody,
  ): Promise<ChangeFieldVotingSessionStatusResponse> {
    const result = await this.closeFieldVotingSessionHandler.execute(
      CloseFieldVotingSessionCommand.of({
        fieldVotingSessionId: params.fieldVotingSessionId,
        closedAt: new Date(body.changedAt),
      }),
    );

    return ChangeFieldVotingSessionStatusResponse.of(result);
  }

  @Post('field-voting-sessions/:fieldVotingSessionId/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: '현장 투표 세션 취소',
    description: '예약 또는 개시된 현장 투표 세션을 취소합니다.',
  })
  @ApiParam({
    name: 'fieldVotingSessionId',
    example: 'session-1',
    description: '취소할 현장 투표 세션 ID입니다.',
  })
  @ApiBody({
    type: ChangeFieldVotingSessionStatusBody,
    description: '현장 투표 세션 취소 정보입니다.',
  })
  @ApiOkResponse({
    type: ChangeFieldVotingSessionStatusResponse,
    description: '현장 투표 세션 상태 변경 결과입니다.',
  })
  async cancelFieldVotingSession(
    @Param() params: ChangeFieldVotingSessionStatusParam,
    @Body() body: ChangeFieldVotingSessionStatusBody,
  ): Promise<ChangeFieldVotingSessionStatusResponse> {
    const result = await this.cancelFieldVotingSessionHandler.execute(
      CancelFieldVotingSessionCommand.of({
        fieldVotingSessionId: params.fieldVotingSessionId,
        canceledAt: new Date(body.changedAt),
      }),
    );

    return ChangeFieldVotingSessionStatusResponse.of(result);
  }
}
