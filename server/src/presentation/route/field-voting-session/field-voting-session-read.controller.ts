import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetFieldVotingSessionPageHandler } from '../../../application/query/handler/get-field-voting-session-page.handler';
import {
  FieldVotingSessionReadNotFoundError,
  GetFieldVotingSessionHandler,
} from '../../../application/query/handler/get-field-voting-session.handler';
import { GetFieldVotingSessionPageQuery as ApplicationPageQuery } from '../../../application/query/dto/request/get-field-voting-session-page.query';
import { GetFieldVotingSessionQuery } from '../../../application/query/dto/request/get-field-voting-session.query';
import { GetFieldVotingSessionPageResponse } from './dto/get-field-voting-session-page-response.dto';
import {
  GetFieldVotingSessionPageParam,
  GetFieldVotingSessionPageQuery,
  GetFieldVotingSessionParam,
} from './dto/get-field-voting-session-request.dto';
import { GetFieldVotingSessionResponse } from './dto/get-field-voting-session-response.dto';

@ApiTags('field-voting-sessions')
@Controller()
export class FieldVotingSessionReadController {
  constructor(
    private readonly getHandler: GetFieldVotingSessionHandler,
    private readonly getPageHandler: GetFieldVotingSessionPageHandler,
  ) {}

  @Get('votes/:voteId/field-voting-sessions')
  @ApiOperation({ summary: '현장 투표 세션 목록 조회' })
  @ApiOkResponse({ type: GetFieldVotingSessionPageResponse })
  async getFieldVotingSessionPage(
    @Param() params: GetFieldVotingSessionPageParam,
    @Query() query: GetFieldVotingSessionPageQuery,
  ): Promise<GetFieldVotingSessionPageResponse> {
    const result = await this.getPageHandler.execute(
      ApplicationPageQuery.of({
        voteId: params.voteId,
        page: Number(query.page),
        pageSize: Number(query.pageSize),
      }),
    );

    return GetFieldVotingSessionPageResponse.of(result);
  }

  @Get('field-voting-sessions/:fieldVotingSessionId')
  @ApiOperation({ summary: '현장 투표 세션 상세 조회' })
  @ApiOkResponse({ type: GetFieldVotingSessionResponse })
  @ApiNotFoundResponse({ description: '현장 투표 세션을 찾을 수 없습니다.' })
  async getFieldVotingSession(
    @Param() params: GetFieldVotingSessionParam,
  ): Promise<GetFieldVotingSessionResponse> {
    try {
      const result = await this.getHandler.execute(
        GetFieldVotingSessionQuery.of({
          fieldVotingSessionId: params.fieldVotingSessionId,
        }),
      );

      return GetFieldVotingSessionResponse.of(result);
    } catch (error) {
      if (error instanceof FieldVotingSessionReadNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
