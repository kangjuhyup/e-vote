import { Body, Controller, HttpCode, Param, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateVoteDetailCommand } from '../../../application/command/create-vote-detail.command';
import { CreateVoteDetailHandler } from '../../../application/command/create-vote-detail.handler';
import {
  CreateVoteDetailBody,
  CreateVoteDetailParam,
} from './dto/create-vote-detail-request.dto';
import { CreateVoteDetailResponse } from './dto/create-vote-detail-response.dto';

@ApiTags('vote-details')
@Controller('votes/:voteId/sub-votes')
export class VoteDetailController {
  constructor(
    private readonly createVoteDetailHandler: CreateVoteDetailHandler,
  ) {}

  @Put()
  @HttpCode(201)
  @ApiOperation({
    summary: '자식 투표 생성',
    description: '부모 투표 아래에 자식 투표 항목을 초안 상태로 생성합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiBody({
    type: CreateVoteDetailBody,
    description: '생성할 자식 투표 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CreateVoteDetailResponse,
    description: '자식 투표 생성 결과입니다.',
  })
  async createVoteDetail(
    @Param() params: CreateVoteDetailParam,
    @Body() body: CreateVoteDetailBody,
  ): Promise<CreateVoteDetailResponse> {
    const result = await this.createVoteDetailHandler.execute(
      CreateVoteDetailCommand.of({
        voteId: params.voteId,
        title: body.title,
        type: body.type,
        sortOrder: body.sortOrder,
        overrides: body.overrides,
      }),
    );

    return CreateVoteDetailResponse.of(result);
  }
}
