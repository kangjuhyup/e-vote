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
import { GetCandidatePageHandler } from '../../../application/query/handler/get-candidate-page.handler';
import { GetCandidatePageQuery as GetCandidatePageApplicationQuery } from '../../../application/query/get-candidate-page.query';
import {
  CandidateNotFoundError,
  GetCandidateHandler,
} from '../../../application/query/handler/get-candidate.handler';
import { GetCandidateQuery } from '../../../application/query/get-candidate.query';
import { CreateCandidateParam } from './dto/create-candidate-request.dto';
import { GetCandidatePageQuery as GetCandidatePageRequestQuery } from './dto/get-candidate-page-request.dto';
import { GetCandidatePageResponse } from './dto/get-candidate-page-response.dto';
import { GetCandidateParam } from './dto/get-candidate-request.dto';
import { GetCandidateResponse } from './dto/get-candidate-response.dto';

@ApiTags('candidates')
@Controller('votes/:voteId/sub-votes/:voteDetailId/candidates')
export class CandidateReadController {
  constructor(
    private readonly getCandidateHandler: GetCandidateHandler,
    private readonly getCandidatePageHandler: GetCandidatePageHandler,
  ) {}

  @Get()
  @ApiOperation({
    summary: '후보 페이지 조회',
    description: '자식 투표에 등록된 후보 목록을 페이지 단위로 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '후보가 속한 자식 투표 ID입니다.',
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
    description: '페이지당 후보 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  @ApiOkResponse({
    type: GetCandidatePageResponse,
    description: '후보 페이지 조회 결과입니다.',
  })
  async getCandidatePage(
    @Param() params: CreateCandidateParam,
    @Query() query: GetCandidatePageRequestQuery,
  ): Promise<GetCandidatePageResponse> {
    const result = await this.getCandidatePageHandler.execute(
      GetCandidatePageApplicationQuery.of({
        voteId: params.voteId,
        voteDetailId: params.voteDetailId,
        page: Number(query.page),
        pageSize: Number(query.pageSize),
      }),
    );

    return GetCandidatePageResponse.of(result);
  }

  @Get(':candidateId')
  @ApiOperation({
    summary: '후보 상세 조회',
    description: '자식 투표에 등록된 단일 후보를 조회합니다.',
  })
  @ApiParam({
    name: 'voteId',
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  @ApiParam({
    name: 'voteDetailId',
    example: 'vote-detail-1',
    description: '후보가 속한 자식 투표 ID입니다.',
  })
  @ApiParam({
    name: 'candidateId',
    example: 'candidate-1',
    description: '조회할 후보 ID입니다.',
  })
  @ApiOkResponse({
    type: GetCandidateResponse,
    description: '후보 상세 조회 결과입니다.',
  })
  @ApiNotFoundResponse({
    description: '후보를 찾을 수 없습니다.',
  })
  async getCandidate(
    @Param() params: GetCandidateParam,
  ): Promise<GetCandidateResponse> {
    try {
      const result = await this.getCandidateHandler.execute(
        GetCandidateQuery.of({
          voteId: params.voteId,
          voteDetailId: params.voteDetailId,
          candidateId: params.candidateId,
        }),
      );

      return GetCandidateResponse.of(result);
    } catch (error) {
      if (error instanceof CandidateNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
