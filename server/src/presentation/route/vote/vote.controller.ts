import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateVoteCommand } from '../../../application/command/create-vote.command';
import { CreateVoteHandler } from '../../../application/command/create-vote.handler';
import { GetVotePageHandler } from '../../../application/query/get-vote-page.handler';
import { GetVotePageQuery as GetVotePageApplicationQuery } from '../../../application/query/get-vote-page.query';
import {
  GetVoteHandler,
  VoteNotFoundError,
} from '../../../application/query/get-vote.handler';
import { GetVoteQuery } from '../../../application/query/get-vote.query';
import { CreateVoteBody } from './dto/create-vote-request.dto';
import { CreateVoteResponse } from './dto/create-vote-response.dto';
import { GetVotePageQuery as GetVotePageRequestQuery } from './dto/get-vote-page-request.dto';
import { GetVotePageResponse } from './dto/get-vote-page-response.dto';
import { GetVoteParam } from './dto/get-vote-request.dto';
import { GetVoteResponse } from './dto/get-vote-response.dto';

@ApiTags('votes')
@Controller('votes')
export class VoteController {
  constructor(
    private readonly createVoteHandler: CreateVoteHandler,
    private readonly getVoteHandler: GetVoteHandler,
    private readonly getVotePageHandler: GetVotePageHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: '부모 투표 페이지 조회',
    description: '부모 투표 목록을 페이지 단위로 조회합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: '조회할 페이지 번호입니다. 생략하면 1입니다.',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    example: 20,
    description: '페이지당 투표 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  @ApiOkResponse({
    type: GetVotePageResponse,
    description: '부모 투표 페이지 조회 결과입니다.',
  })
  async getVotePage(
    @Query() query: GetVotePageRequestQuery,
  ): Promise<GetVotePageResponse> {
    const result = await this.getVotePageHandler.execute(
      GetVotePageApplicationQuery.of({
        page: Number(query.page),
        pageSize: Number(query.pageSize),
      }),
    );

    return GetVotePageResponse.of(result);
  }

  @Get(':voteId')
  @ApiOperation({
    summary: '부모 투표 전체 상세 조회',
    description: '부모 투표와 자식 투표, 후보 정보를 함께 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '상세 조회할 부모 투표 ID입니다.',
  })
  @ApiOkResponse({
    type: GetVoteResponse,
    description: '부모 투표 전체 상세 조회 결과입니다.',
  })
  @ApiNotFoundResponse({
    description: '부모 투표를 찾을 수 없습니다.',
  })
  async getVote(@Param() params: GetVoteParam): Promise<GetVoteResponse> {
    try {
      const result = await this.getVoteHandler.execute(
        GetVoteQuery.of({ voteId: params.voteId }),
      );

      return GetVoteResponse.of(result);
    } catch (error) {
      if (error instanceof VoteNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  @Post()
  @ApiOperation({
    summary: '부모 투표 생성',
    description: '부모 투표를 초안 상태로 생성합니다.',
  })
  @ApiBody({
    type: CreateVoteBody,
    description: '생성할 부모 투표 정보입니다.',
  })
  @ApiCreatedResponse({
    type: CreateVoteResponse,
    description: '부모 투표 생성 결과입니다.',
  })
  async createVote(@Body() body: CreateVoteBody): Promise<CreateVoteResponse> {
    const result = await this.createVoteHandler.execute(
      CreateVoteCommand.of({
        commissionId: body.commissionId,
        title: body.title,
        votingChannels: body.votingChannels,
        defaultPolicy: body.defaultPolicy,
        identityVerificationPolicy: body.identityVerificationPolicy,
      }),
    );

    return CreateVoteResponse.of(result);
  }
}
