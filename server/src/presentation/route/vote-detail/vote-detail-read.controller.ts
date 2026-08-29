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
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetVoteDetailPageHandler } from '../../../application/query/handler/get-vote-detail-page.handler';
import { GetVoteDetailPageQuery as GetVoteDetailPageApplicationQuery } from '../../../application/query/get-vote-detail-page.query';
import {
  GetVoteDetailHandler,
  VoteDetailNotFoundError,
} from '../../../application/query/handler/get-vote-detail.handler';
import { GetVoteDetailQuery } from '../../../application/query/get-vote-detail.query';
import { CreateVoteDetailParam } from './dto/create-vote-detail-request.dto';
import { GetVoteDetailPageQuery as GetVoteDetailPageRequestQuery } from './dto/get-vote-detail-page-request.dto';
import { GetVoteDetailPageResponse } from './dto/get-vote-detail-page-response.dto';
import { GetVoteDetailParam } from './dto/get-vote-detail-request.dto';
import { GetVoteDetailResponse } from './dto/get-vote-detail-response.dto';

@ApiTags('vote-details')
@Controller('votes/:voteId/sub-votes')
export class VoteDetailReadController {
  constructor(
    private readonly getVoteDetailHandler: GetVoteDetailHandler,
    private readonly getVoteDetailPageHandler: GetVoteDetailPageHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: '자식 투표 페이지 조회',
    description: '부모 투표 아래의 자식 투표 목록을 페이지 단위로 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
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
    description: '페이지당 자식 투표 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  @ApiOkResponse({
    type: GetVoteDetailPageResponse,
    description: '자식 투표 페이지 조회 결과입니다.',
  })
  async getVoteDetailPage(
    @Param() params: CreateVoteDetailParam,
    @Query() query: GetVoteDetailPageRequestQuery,
  ): Promise<GetVoteDetailPageResponse> {
    const result = await this.getVoteDetailPageHandler.execute(
      GetVoteDetailPageApplicationQuery.of({
        voteId: params.voteId,
        page: Number(query.page),
        pageSize: Number(query.pageSize),
      }),
    );

    return GetVoteDetailPageResponse.of(result);
  }

  @Get(':voteDetailId')
  @ApiOperation({
    summary: '자식 투표 상세 조회',
    description: '부모 투표 아래의 단일 자식 투표를 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '조회할 자식 투표 ID입니다.',
  })
  @ApiOkResponse({
    type: GetVoteDetailResponse,
    description: '자식 투표 상세 조회 결과입니다.',
  })
  @ApiNotFoundResponse({
    description: '자식 투표를 찾을 수 없습니다.',
  })
  async getVoteDetail(
    @Param() params: GetVoteDetailParam,
  ): Promise<GetVoteDetailResponse> {
    try {
      const result = await this.getVoteDetailHandler.execute(
        GetVoteDetailQuery.of({
          voteId: params.voteId,
          voteDetailId: params.voteDetailId,
        }),
      );

      return GetVoteDetailResponse.of(result);
    } catch (error) {
      if (error instanceof VoteDetailNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
