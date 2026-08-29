import {
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { GetVoteResultHandler } from '../../../application/query/handler/get-vote-result.handler';
import { GetVoteResultQuery } from '../../../application/query/get-vote-result.query';
import { GetVoteTurnoutHandler } from '../../../application/query/handler/get-vote-turnout.handler';
import { GetVoteTurnoutQuery } from '../../../application/query/get-vote-turnout.query';
import {
  VoteResultUnavailableError,
  VoteStatisticsInconsistentError,
  VoteStatisticsNotFoundError,
} from '../../../application/query/vote-statistics.error';
import { GetVoteResultResponse } from './dto/get-vote-result-response.dto';
import { GetVoteStatisticsParam } from './dto/get-vote-statistics-request.dto';
import { GetVoteTurnoutResponse } from './dto/get-vote-turnout-response.dto';

@ApiTags('vote-statistics')
@Controller('votes/:voteId/sub-votes/:voteDetailId')
export class VoteStatisticsController {
  constructor(
    private readonly getVoteTurnoutHandler: GetVoteTurnoutHandler,
    private readonly getVoteResultHandler: GetVoteResultHandler,
  ) {}

  @Get('turnout')
  @ApiOperation({
    summary: '투표율 조회',
    description: '선거인, 투표권 단위, 표 가중치 기준 투표율을 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '자식 투표 ID입니다.',
  })
  @ApiOkResponse({
    type: GetVoteTurnoutResponse,
    description: '자식 투표의 투표율입니다.',
  })
  @ApiNotFoundResponse({ description: '자식 투표를 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description: '선거인 그룹의 지분 데이터가 일관되지 않습니다.',
  })
  async getTurnout(
    @Param() params: GetVoteStatisticsParam,
  ): Promise<GetVoteTurnoutResponse> {
    try {
      const result = await this.getVoteTurnoutHandler.execute(
        GetVoteTurnoutQuery.of(params),
      );
      return GetVoteTurnoutResponse.of(result);
    } catch (error) {
      throwVoteStatisticsHttpError(error);
    }
  }

  @Get('results')
  @ApiOperation({
    summary: '투표 결과 조회',
    description:
      '참여자 수, 후보별 득표율, 투표 채널별 참여 현황을 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '자식 투표 ID입니다.',
  })
  @ApiOkResponse({
    type: GetVoteResultResponse,
    description: '자식 투표의 집계 결과입니다.',
  })
  @ApiNotFoundResponse({ description: '자식 투표를 찾을 수 없습니다.' })
  @ApiConflictResponse({
    description:
      '부모 투표와 자식 투표가 모두 종료된 후 결과를 조회할 수 있습니다.',
  })
  async getResult(
    @Param() params: GetVoteStatisticsParam,
  ): Promise<GetVoteResultResponse> {
    try {
      const result = await this.getVoteResultHandler.execute(
        GetVoteResultQuery.of(params),
      );
      return GetVoteResultResponse.of(result);
    } catch (error) {
      throwVoteStatisticsHttpError(error);
    }
  }
}

function throwVoteStatisticsHttpError(error: unknown): never {
  if (error instanceof VoteStatisticsNotFoundError) {
    throw new NotFoundException(error.message);
  }

  if (
    error instanceof VoteResultUnavailableError ||
    error instanceof VoteStatisticsInconsistentError
  ) {
    throw new ConflictException(error.message);
  }

  throw error;
}
